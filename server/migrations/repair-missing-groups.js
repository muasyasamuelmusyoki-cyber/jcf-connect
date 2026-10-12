'use strict';

// Targeted repair for the two groups omitted by the first import script.
// This only touches church_groups and the church migration marker.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../licensing-db');

const SOURCE_FILE = path.join(__dirname, '..', 'data', 'jcf.json');
const MIGRATION_NAME = '2026-10-12-json-church-data-v1';

function stableId(record, index) {
  return record && record.id !== undefined && record.id !== null && String(record.id)
    ? String(record.id)
    : `groups:${index + 1}`;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
}

async function main() {
  if (!process.env.LICENSING_DATABASE_URL) {
    throw new Error('LICENSING_DATABASE_URL is not configured.');
  }
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error(`Source JSON not found: ${SOURCE_FILE}`);
  }

  const source = JSON.parse(fs.readFileSync(SOURCE_FILE, 'utf8').replace(/^\uFEFF/, ''));
  if (!Array.isArray(source.groups)) {
    throw new Error('Expected groups to be an array in server/data/jcf.json.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const marker = await client.query(
      'SELECT row_counts FROM church_data_migrations WHERE migration_name = $1 FOR UPDATE',
      [MIGRATION_NAME]
    );
    if (!marker.rowCount) {
      throw new Error('Original church-data migration marker was not found; stopped without changes.');
    }

    await client.query(`
      CREATE TABLE IF NOT EXISTS church_groups (
        id TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        position INTEGER
      )
    `);
    await client.query('ALTER TABLE church_groups ADD COLUMN IF NOT EXISTS position INTEGER');

    const current = await client.query('SELECT id, data FROM church_groups ORDER BY position ASC NULLS LAST, created_at ASC, id ASC');
    if (current.rowCount === 0) {
      const seen = new Set();
      for (let i = 0; i < source.groups.length; i += 1) {
        const record = source.groups[i];
        if (!record || typeof record !== 'object' || Array.isArray(record)) {
          throw new Error(`Invalid group record at index ${i}.`);
        }
        const id = stableId(record, i);
        if (seen.has(id)) throw new Error(`Duplicate group ID: ${id}`);
        seen.add(id);
        await client.query(
          'INSERT INTO church_groups (id, data, position) VALUES ($1, $2::jsonb, $3)',
          [id, JSON.stringify(record), i]
        );
      }
      console.log(`Restored ${source.groups.length} group records.`);
    } else {
      const expectedById = new Map(source.groups.map((record, index) => [stableId(record, index), record]));
      const matches = current.rowCount === source.groups.length && current.rows.every((row) => {
        const expected = expectedById.get(row.id);
        return expected !== undefined &&
          JSON.stringify(canonical(row.data)) === JSON.stringify(canonical(expected));
      });
      if (!matches) {
        throw new Error('church_groups already contains different data; stopped to avoid overwriting it.');
      }
      console.log('church_groups already matches the source; no group rows changed.');
    }

    const counts = marker.rows[0].row_counts || {};
    counts.groups = source.groups.length;
    await client.query(
      'UPDATE church_data_migrations SET row_counts = $1::jsonb WHERE migration_name = $2',
      [JSON.stringify(counts), MIGRATION_NAME]
    );
    await client.query('COMMIT');
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Group-data repair stopped:', error.message);
  process.exitCode = 1;
});
