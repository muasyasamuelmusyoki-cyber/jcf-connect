require('dotenv').config();

const { pool } = require('./licensing-db');

async function verify() {
const result = await pool.query(`     SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'license_records',
        'license_installations',
        'license_events'
      )
    ORDER BY table_name;
  `);

const found = result.rows.map(row => row.table_name);
console.log('Found licensing tables:');

for (const name of found) {
console.log('- ' + name);
}

const expected = [
'license_events',
'license_installations',
'license_records'
];

const missing = expected.filter(name => !found.includes(name));

if (missing.length) {
throw new Error('Missing tables: ' + missing.join(', '));
}

console.log('Verification successful. All three licensing tables exist.');
}

verify()
.catch(error => {
console.error('Verification failed:', error.message);
process.exitCode = 1;
})
.finally(async () => {
await pool.end();
});
