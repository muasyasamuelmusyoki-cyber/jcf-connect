
const crypto = require('crypto');
const { pool } = require('./licensing-db');

function hashKey(key) {
  return crypto
    .createHash('sha256')
    .update(key.trim().toUpperCase())
    .digest('hex');
}

function generateActivationKey() {
  const random = crypto.randomBytes(20).toString('hex').toUpperCase();
  const parts = random.match(/.{1,5}/g);
  return `JCF-${parts.join('-')}`;
}

function isExpired(expiresAt) {
  return expiresAt !== null &&
    expiresAt !== undefined &&
    new Date(expiresAt).getTime() <= Date.now();
}

// Create a licence. The activation key is returned only once.
async function issueLicense({
  customerName = null,
  customerEmail = null,
  maxInstallations = 1,
  expiresAt = null,
  createdBy = null,
  notes = null
} = {}) {
  if (
    !Number.isInteger(maxInstallations) ||
    maxInstallations < 1 ||
    maxInstallations > 100
  ) {
    throw new Error('Installation limit must be between 1 and 100.');
  }

  if (expiresAt !== null && expiresAt !== undefined) {
    const expiry = Date.parse(expiresAt);

    if (Number.isNaN(expiry)) {
      throw new Error('Invalid expiry date.');
    }

    if (expiry <= Date.now()) {
      throw new Error('Expiry date must be in the future.');
    }
  }

  const key = generateActivationKey();

  const result = await pool.query(
    `INSERT INTO license_records
      (key_hash, key_prefix, customer_name, customer_email,
       max_installations, expires_at, created_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, key_prefix, status, max_installations,
               expires_at, created_at`,
    [
      hashKey(key),
      key.slice(0, 9),
      customerName,
      customerEmail,
      maxInstallations,
      expiresAt,
      createdBy,
      notes
    ]
  );

  return {
    license: result.rows[0],
    activationKey: key
  };
}

// Validate a licence without registering an installation.
async function checkLicense(key) {
  if (typeof key !== 'string' || key.trim().length < 20) {
    return { valid: false, reason: 'invalid_key' };
  }

  const result = await pool.query(
    `SELECT id, status, max_installations, expires_at
     FROM license_records
     WHERE key_hash = $1`,
    [hashKey(key)]
  );

  if (result.rowCount === 0) {
    return { valid: false, reason: 'invalid_key' };
  }

  const license = result.rows[0];

  if (license.status !== 'active') {
    return { valid: false, reason: 'revoked' };
  }

  if (isExpired(license.expires_at)) {
    return { valid: false, reason: 'expired' };
  }

  return {
    valid: true,
    licenseId: license.id,
    maxInstallations: license.max_installations,
    expiresAt: license.expires_at
  };
}

// Activate or revalidate an installation against a licence.
async function activateInstallation({
  key,
  installationId,
  deviceLabel = null,
  appVersion = null
} = {}) {
  if (typeof key !== 'string' || key.trim().length < 20) {
    return { success: false, reason: 'invalid_key' };
  }

  if (
    typeof installationId !== 'string' ||
    !/^[a-zA-Z0-9_-]{16,128}$/.test(installationId)
  ) {
    return { success: false, reason: 'invalid_installation_id' };
  }

  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    // Lock the licence row to serialize activations for this licence.
    const licenseResult = await client.query(
      `SELECT id, status, max_installations, expires_at
       FROM license_records
       WHERE key_hash = $1
       FOR UPDATE`,
      [hashKey(key)]
    );

    if (licenseResult.rowCount === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { success: false, reason: 'invalid_key' };
    }

    const license = licenseResult.rows[0];

    if (license.status !== 'active') {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { success: false, reason: 'revoked' };
    }

    if (isExpired(license.expires_at)) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return { success: false, reason: 'expired' };
    }

    const existing = await client.query(
      `SELECT id, revoked_at
       FROM license_installations
       WHERE license_id = $1 AND installation_id = $2
       FOR UPDATE`,
      [license.id, installationId]
    );

    if (
      existing.rowCount > 0 &&
      existing.rows[0].revoked_at === null
    ) {
      // Refresh an already-active installation.
      await client.query(
        `UPDATE license_installations
         SET last_seen_at = NOW(),
             device_label = $2,
             app_version = $3
         WHERE id = $1`,
        [
          existing.rows[0].id,
          deviceLabel,
          appVersion
        ]
      );
    } else {
      const countResult = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM license_installations
         WHERE license_id = $1 AND revoked_at IS NULL`,
        [license.id]
      );

      if (countResult.rows[0].total >= license.max_installations) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return {
          success: false,
          reason: 'installation_limit_reached'
        };
      }

      if (existing.rowCount > 0) {
        // Reactivate a previously revoked installation.
        await client.query(
          `UPDATE license_installations
           SET revoked_at = NULL,
               activated_at = NOW(),
               last_seen_at = NOW(),
               device_label = $2,
               app_version = $3
           WHERE id = $1`,
          [
            existing.rows[0].id,
            deviceLabel,
            appVersion
          ]
        );
      } else {
        await client.query(
          `INSERT INTO license_installations
            (license_id, installation_id, device_label, app_version)
           VALUES ($1, $2, $3, $4)`,
          [license.id, installationId, deviceLabel, appVersion]
        );
      }
    }

    await client.query(
      `INSERT INTO license_events
        (license_id, installation_id, event_type)
       VALUES ($1, $2, 'installation_activated')`,
      [license.id, installationId]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return {
      success: true,
      licenseId: license.id,
      expiresAt: license.expires_at
    };
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original error if rollback also fails.
      }
    }

    throw error;
  } finally {
    client.release();
  }
}

// Revoke a licence and deactivate all its registered installations.
async function revokeLicense(licenseId, actor = null) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const result = await client.query(
      `UPDATE license_records
       SET status = 'revoked', revoked_at = NOW()
       WHERE id = $1 AND status = 'active'
       RETURNING id`,
      [licenseId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      transactionStarted = false;
      return false;
    }

    await client.query(
      `UPDATE license_installations
       SET revoked_at = NOW()
       WHERE license_id = $1 AND revoked_at IS NULL`,
      [licenseId]
    );

    await client.query(
      `INSERT INTO license_events
        (license_id, event_type, details)
       VALUES ($1, 'license_revoked', $2::jsonb)`,
      [licenseId, JSON.stringify({ actor })]
    );

    await client.query('COMMIT');
    transactionStarted = false;

    return true;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the original error if rollback also fails.
      }
    }

    throw error;
  } finally {
    client.release();
  }
}


module.exports = {
  issueLicense,
  checkLicense,
  activateInstallation,
  revokeLicense
};