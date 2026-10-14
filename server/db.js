'use strict';

// PostgreSQL-backed church data store.
// Licensing tables are managed separately and are never modified here.
const { pool } = require('./licensing-db');

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

const MIGRATION_NAME = '2026-10-12-json-church-data-v1';

let store = Object.fromEntries(
  COLLECTIONS.map((name) => [name, []])
);

store.settings = {};

let initialized = false;
let saveQueue = Promise.resolve();

function tableName(collection) {
  if (collection === 'settings') {
    return 'church_settings';
  }

  if (!COLLECTIONS.includes(collection)) {
    throw new Error(`Unknown church data collection: ${collection}`);
  }

  return `church_${collection}`;
}

function recordId(record, collection, index) {
  if (
    record &&
    record.id !== undefined &&
    record.id !== null &&
    String(record.id)
  ) {
    return String(record.id);
  }

  return `${collection}:${index + 1}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

// INITIALIZE DATABASE
async function init() {
  if (initialized) {
    return;
  }

  const marker = await pool.query(
    'SELECT migration_name FROM church_data_migrations WHERE migration_name = $1',
    [MIGRATION_NAME]
  );

  if (!marker.rowCount) {
    throw new Error(
      'Church data migration marker was not found. Run the one-time JSON-to-PostgreSQL import before starting the API.'
    );
  }

  const loaded = Object.fromEntries(
    COLLECTIONS.map((name) => [name, []])
  );

  for (const collection of COLLECTIONS) {
    const table = tableName(collection);

    await pool.query(
      `ALTER TABLE ${table}
       ADD COLUMN IF NOT EXISTS position INTEGER`
    );

    await pool.query(`
      WITH ordered_rows AS (
        SELECT id,
          (
            SELECT COALESCE(MAX(position), -1)
            FROM ${table}
          ) + ROW_NUMBER() OVER (ORDER BY ctid) AS next_position
        FROM ${table}
        WHERE position IS NULL
      )
      UPDATE ${table} AS target
      SET position = ordered_rows.next_position
      FROM ordered_rows
      WHERE target.id = ordered_rows.id
    `);

    const result = await pool.query(
      `SELECT data
       FROM ${table}
       ORDER BY position ASC, created_at ASC, id ASC`
    );

    loaded[collection] = result.rows.map((row) => row.data);
  }

  const settingsResult = await pool.query(
    "SELECT data FROM church_settings WHERE id = 'singleton' LIMIT 1"
  );

  loaded.settings = settingsResult.rowCount
    ? settingsResult.rows[0].data
    : {};

  store = loaded;
  initialized = true;

  console.log('Church data loaded from PostgreSQL.');
}

// FULL STORE PERSISTENCE
async function persistSnapshot(snapshot) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    for (const collection of COLLECTIONS) {
      const table = tableName(collection);

      await client.query(`DELETE FROM ${table}`);

      const records = Array.isArray(snapshot[collection])
        ? snapshot[collection]
        : [];

      const seen = new Set();

      for (let index = 0; index < records.length; index += 1) {
        const record = records[index];

        if (
          !record ||
          typeof record !== 'object' ||
          Array.isArray(record)
        ) {
          throw new Error(
            `Invalid record in church collection "${collection}" at index ${index}.`
          );
        }

        const id = recordId(record, collection, index);

        if (seen.has(id)) {
          throw new Error(
            `Duplicate record ID "${id}" in church collection "${collection}".`
          );
        }

        seen.add(id);

        await client.query(
          `INSERT INTO ${table}
             (id, data, position, updated_at)
           VALUES ($1, $2::jsonb, $3, NOW())`,
          [id, JSON.stringify(record), index]
        );
      }
    }

    await client.query(
      "DELETE FROM church_settings WHERE id <> 'singleton'"
    );

    await client.query(
      `INSERT INTO church_settings
         (id, data, updated_at)
       VALUES ('singleton', $1::jsonb, NOW())
       ON CONFLICT (id)
       DO UPDATE SET
         data = EXCLUDED.data,
         updated_at = NOW()`,
      [
        JSON.stringify(
          snapshot.settings &&
          typeof snapshot.settings === 'object'
            ? snapshot.settings
            : {}
        )
      ]
    );

    await client.query('COMMIT');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // Preserve the original database error.
    }

    throw error;
  } finally {
    client.release();
  }
}

// GET STORE
function getStore() {
  if (!initialized) {
    throw new Error(
      'Church PostgreSQL store has not initialized yet.'
    );
  }

  return store;
}

// SAVE ENTIRE STORE
function saveStore() {
  if (!initialized) {
    return Promise.reject(
      new Error('Church PostgreSQL store has not initialized yet.')
    );
  }

  const snapshot = clone(store);

  const task = saveQueue.then(
    () => persistSnapshot(snapshot)
  );

  saveQueue = task.catch((error) => {
    console.error(
      'Church PostgreSQL save failed:',
      error.message
    );
  });

  return task;
}

// FIND USER BY EMAIL
function findUserByEmail(email) {
  const normalized = (email || '').trim().toLowerCase();

  return (getStore().users || []).find(
    (user) =>
      (user.email || '').toLowerCase() === normalized &&
      user.status === 'Active'
  ) || null;
}

// FIND USER BY ID
function findUserById(id) {
  return (getStore().users || []).find(
    (user) => String(user.id) === String(id)
  ) || null;
}

// UPDATE PASSWORD DIRECTLY IN POSTGRESQL
function updateUserPassword(id, passwordHash) {
  if (!initialized) {
    return Promise.reject(
      new Error('Church PostgreSQL store has not initialized yet.')
    );
  }

  const user = findUserById(id);

  if (!user) {
    return Promise.reject(
      new Error('User not found while saving password reset.')
    );
  }

  const task = saveQueue.then(async () => {
    const result = await pool.query(
      `UPDATE church_users
       SET data =
             (data - 'resetCode' - 'resetExpires' - 'resetAttempts')
             || jsonb_build_object(
                  'passwordHash', $2::text,
                  'password', $2::text
                ),
           updated_at = NOW()
       WHERE id = $1
       RETURNING data`,
      [String(id), passwordHash]
    );

    if (result.rowCount !== 1) {
      throw new Error(
        'Could not find the user row in PostgreSQL.'
      );
    }

    Object.assign(user, result.rows[0].data);

    return user;
  });

  saveQueue = task.catch((error) => {
    console.error(
      'Church PostgreSQL password update failed:',
      error.message
    );
  });

  return task;
}

// UPDATE RESET CODE DIRECTLY IN POSTGRESQL
async function updateUserResetCode(id, code, expiresAt) {
  if (!initialized) {
    throw new Error(
      'Church PostgreSQL store has not initialized yet.'
    );
  }

  const user = findUserById(id);

  if (!user) {
    throw new Error(
      'User not found while saving password reset code.'
    );
  }

  const task = saveQueue.then(async () => {
    const result = await pool.query(
      `UPDATE church_users
       SET data = data
         || jsonb_build_object(
              'resetCode', $2::text,
              'resetExpires', $3::bigint,
              'resetAttempts', 0
            ),
           updated_at = NOW()
       WHERE id = $1
       RETURNING data`,
      [String(id), String(code), expiresAt]
    );

    if (result.rowCount !== 1) {
      throw new Error(
        'Could not find the user row in PostgreSQL.'
      );
    }

    // Synchronize the in-memory user with the saved JSONB record.
    Object.assign(user, result.rows[0].data);

    return user;
  });

  saveQueue = task.catch((error) => {
    console.error(
      'Church PostgreSQL reset-code update failed:',
      error.message
    );
  });

  return task;
}

// MEMBERS
function getMembers() {
  return (getStore().members || []).slice().reverse();
}

function getMember(id) {
  return (getStore().members || []).find(
    (member) => String(member.id) === String(id)
  ) || null;
}

function addMember(member) {
  const data = getStore();

  if (!Array.isArray(data.members)) {
    data.members = [];
  }

  data.members.push(member);

  return member;
}

function updateMember(id, data) {
  const members = getStore().members || [];

  const index = members.findIndex(
    (member) => String(member.id) === String(id)
  );

  if (index === -1) {
    return null;
  }

  members[index] = {
    ...members[index],
    ...data,
    id: members[index].id
  };

  return members[index];
}

function deleteMember(id) {
  const data = getStore();
  const before = (data.members || []).length;

  data.members = (data.members || []).filter(
    (member) => String(member.id) !== String(id)
  );

  return before !== data.members.length;
}

// EXPORTS
module.exports = {
  pool,
  init,
  getStore,
  saveStore,
  findUserByEmail,
  findUserById,
  updateUserPassword,
  updateUserResetCode,
  getMembers,
  getMember,
  addMember,
  updateMember,
  deleteMember
};