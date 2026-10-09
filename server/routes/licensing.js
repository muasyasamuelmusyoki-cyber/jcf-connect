
const express = require('express');
const router = express.Router();

const { authRequired, requireRole } = require('../middleware/auth');

function getLicensingModules() {
  if (!process.env.LICENSING_DATABASE_URL) {
    const error = new Error('Licensing is not configured.');
    error.status = 503;
    throw error;
  }

  return {
    db: require('../licensing-db'),
    service: require('../licensing-service')
  };
}

function handleError(res, error) {
  console.error('Licensing API error:', error.message);
  return res.status(error.status || 500).json({
    error: error.status === 503
      ? error.message
      : 'The licensing request could not be completed.'
  });
}

// Only authenticated Admin and Super Admin users may manage licences.
router.use(authRequired, requireRole('Admin'));

// List licences without exposing activation-key hashes.
router.get('/', async (req, res) => {
  try {
    const { db } = getLicensingModules();

    const result = await db.pool.query(`
      SELECT
        l.id,
        l.key_prefix,
        l.customer_name,
        l.customer_email,
        l.status,
        l.max_installations,
        l.expires_at,
        l.created_at,
        l.created_by,
        l.revoked_at,
        l.notes,
        (
          SELECT COUNT(*)::int
          FROM license_installations i
          WHERE i.license_id = l.id
            AND i.revoked_at IS NULL
        ) AS active_installations
      FROM license_records l
      ORDER BY l.created_at DESC
      LIMIT 500
    `);

    return res.json({ licenses: result.rows });
  } catch (error) {
    return handleError(res, error);
  }
});

// Issue a licence. The activation key is returned only at creation.
router.post('/', async (req, res) => {
  try {
    const { service } = getLicensingModules();

    const {
      customerName,
      customerEmail,
      maxInstallations = 1,
      expiresAt = null,
      notes = null
    } = req.body || {};

    if (
      typeof customerName !== 'string' ||
      !customerName.trim() ||
      customerName.trim().length > 200
    ) {
      return res.status(400).json({
        error: 'A customer name of 1–200 characters is required.'
      });
    }

    if (
      customerEmail != null &&
      (typeof customerEmail !== 'string' ||
        customerEmail.length > 254)
    ) {
      return res.status(400).json({
        error: 'Customer email must be 254 characters or fewer.'
      });
    }

    if (
      !Number.isInteger(Number(maxInstallations)) ||
      Number(maxInstallations) < 1 ||
      Number(maxInstallations) > 100
    ) {
      return res.status(400).json({
        error: 'maxInstallations must be an integer from 1 to 100.'
      });
    }

    if (
      notes != null &&
      (typeof notes !== 'string' || notes.length > 5000)
    ) {
      return res.status(400).json({
        error: 'Notes must be text of 5000 characters or fewer.'
      });
    }

    const result = await service.issueLicense({
      customerName: customerName.trim(),
      customerEmail: customerEmail ? customerEmail.trim() : null,
      maxInstallations: Number(maxInstallations),
      expiresAt,
      createdBy: req.user.email,
      notes
    });

    return res.status(201).json({
      message: 'Licence created successfully. Save the activation key securely; it will not be shown again.',
      license: result.license,
      activationKey: result.activationKey
    });
  } catch (error) {
    return handleError(res, error);
  }
});

// Revoke a licence.
router.post('/:id/revoke', async (req, res) => {
  try {
    const id = req.params.id;

    if (!/^[1-9]\d*$/.test(id)) {
      return res.status(400).json({ error: 'Invalid licence ID.' });
    }

    const { service } = getLicensingModules();
    const result = await service.revokeLicense(id, req.user.email);

    return res.json({
      message: 'Licence revocation request completed.',
      result
    });
  } catch (error) {
    return handleError(res, error);
  }
});

module.exports = router;