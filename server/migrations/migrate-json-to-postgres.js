'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pool } = require('../licensing-db');

const SOURCE_FILE = path.join(__dirname, '..', 'data', 'jcf.json');
const MIGRATION_NAME = '2026-10-12-json-church-data-v1';

const COLLECTIONS = [
  'users',
  'members',
  'visitors',
  'attendance',
  'finance',
  'events',
  'assets',
  'departments',
  'dept_members',
  'growth_groups',
  'groups',
  'group_members',
  'leaders',
  'champs_classes',
  'champs_students',
  'logs'
];

function quoteIdentifier(value) {
  // Only static, internally defined identifiers are allowed here.
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function getStableId(record, collection, index) {
  if (record && record.id !== undefined && record.id !== null && String(record.id)) {
    return String(record.id);
  }
  return `${collection}:${index + 1}`;
}

async function main() {
  if (!process.env.LICENSING_DATABASE_URL) {
    throw new Error('LICENSING_DATABASE_URL is not configured. Set it locally; do not paste it into chat.');
  }

  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Source JSON not found: ${SOURCE_FILE}`);
  }

  const rawText = fs.readFileSync(SOURCE_FILE, 'utf8').replace(/^\uFEFF/, '');
  let source;
  try {
    source = JSON.parse(rawText);
  } catch {
    throw new Error('The source jcf.json is not valid JSON. No database changes were made.');
  }

  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    throw new Error('The source JSON root must be an object. No database changes were made.');
  }

  const checksum = crypto.createHash('sha256').update(rawText, 'utf8').digest('hex');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // All new tables use the church_ prefix, keeping licensing table names untouched.
    await client.query(`
      CREATE TABLE IF NOT EXISTS church_data_migrations (
        migration_name TEXT PRIMARY KEY,
        source_sha256 CHAR(64) NOT NULL,
        imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        row_counts JSONB NOT NULL
      )
    `);

    const already = await client.query(
      'SELECT migration_name, source_sha256, imported_at, row_counts FROM church_data_migrations WHERE migration_name = $1',
      [MIGRATION_NAME]
    );

    if (already.rowCount) {
      const row = already.rows[0];
      console.log(`Migration already recorded at ${row.imported_at.toISOString()}.`);
      console.log(`Source SHA-256: ${row.source_sha256.trim()}`);
      console.log('No rows were changed. This migration is intentionally one-time.');
      await client.query('ROLLBACK');
      return;
    }

    const collections = {};
    for (const collection of COLLECTIONS) {
      const value = source[collection] === undefined ? [] : source[collection];
      if (!Array.isArray(value)) {
        throw new Error(`Expected "${collection}" to be an array in jcf.json.`);
      }
      collections[collection] = value;
    }

    const settings = source.settings === undefined ? {} : source.settings;
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new Error('Expected "settings" to be an object in jcf.json.');
    }

    const tableNames = COLLECTIONS.map((name) => `church_${name}`).concat('church_settings');
    for (const tableName of tableNames) {
      const table = quoteIdentifier(tableName);
      await client.query(`
        CREATE TABLE IF NOT EXISTS ${table} (
          id TEXT PRIMARY KEY,
          data JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `);

      const count = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`);
      if (count.rows[0].count !== 0) {
        throw new Error(
          `${tableName} already contains data but this migration has no completion marker. ` +
          'Stopped to avoid overwriting or mixing data. Inspect the tables before retrying.'
        );
      }
    }

    const counts = {};
    for (const collection of COLLECTIONS) {
      const table = quoteIdentifier(`church_${collection}`);
      const seen = new Set();
      const records = collections[collection];

      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          throw new Error(`Invalid record in "${collection}" at index ${index}.`);
        }
        const id = getStableId(record, collection, index);
        if (seen.has(id)) {
          throw new Error(`Duplicate ID "${id}" found in "${collection}". No migration was committed.`);
        }
        seen.add(id);

        // Do not migrate transient password-reset tokens from the JSON test store.
        // They are short-lived authentication material, not durable user profile data.
        const storedRecord = { ...record };
        if (collection === 'users') {
          delete storedRecord.resetCode;
          delete storedRecord.resetExpires;
        }

        await client.query(
          `INSERT INTO ${table} (id, data) VALUES ($1, $2::jsonb)`,
          [id, JSON.stringify(storedRecord)]
        );
      }
      counts[collection] = records.length;
    }

    await client.query(
      'INSERT INTO church_settings (id, data) VALUES ($1, $2::jsonb)',
      ['singleton', JSON.stringify(settings)]
    );
    counts.settings = 1;

    await client.query(
      `INSERT INTO church_data_migrations (migration_name, source_sha256, row_counts)
       VALUES ($1, $2, $3::jsonb)`,
      [MIGRATION_NAME, checksum, JSON.stringify(counts)]
    );

    await client.query('COMMIT');

    console.log('One-time church-data import completed successfully.');
    console.log(`Source SHA-256: ${checksum}`);
    console.log('Imported record counts:');
    for (const [name, count] of Object.entries(counts)) {
      console.log(`  ${name}: ${count}`);
    }
    console.log('Licensing tables were not modified by this script.');
    console.log('Important: the API still uses JSON until its routes and auth middleware are refactored.');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Migration stopped:', error.message);
  process.exitCode = 1;
});
