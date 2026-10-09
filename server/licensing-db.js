
const { Pool } = require('pg');

if (!process.env.LICENSING_DATABASE_URL) {
  throw new Error('LICENSING_DATABASE_URL is not configured.');
}

const pool = new Pool({
  connectionString: process.env.LICENSING_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  max: 5
});

async function initSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS license_records (
      id BIGSERIAL PRIMARY KEY,
      key_hash CHAR(64) UNIQUE NOT NULL,
      key_prefix VARCHAR(16) NOT NULL,
      customer_name VARCHAR(200),
      customer_email VARCHAR(254),
      status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'revoked')),
      max_installations INTEGER NOT NULL DEFAULT 1
        CHECK (max_installations > 0),
      expires_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_by VARCHAR(254),
      revoked_at TIMESTAMPTZ,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS license_installations (
      id BIGSERIAL PRIMARY KEY,
      license_id BIGINT NOT NULL
        REFERENCES license_records(id),
      installation_id VARCHAR(128) NOT NULL,
      device_label VARCHAR(200),
      app_version VARCHAR(50),
      activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      revoked_at TIMESTAMPTZ,
      UNIQUE (license_id, installation_id)
    );

    CREATE TABLE IF NOT EXISTS license_events (
      id BIGSERIAL PRIMARY KEY,
      license_id BIGINT REFERENCES license_records(id)
        ON DELETE SET NULL,
      installation_id VARCHAR(128),
      event_type VARCHAR(50) NOT NULL,
      details JSONB NOT NULL DEFAULT '{}'::jsonb,
      ip_address VARCHAR(64),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_license_installations_license
      ON license_installations(license_id);

    CREATE INDEX IF NOT EXISTS idx_license_events_created
      ON license_events(created_at);
  `);
}

module.exports = { pool, initSchema };