# JCF Connect — one-time PostgreSQL church-data import kit

This kit imports the current `server/data/jcf.json` test data into the **same PostgreSQL database** already configured by `LICENSING_DATABASE_URL`.

## Safety properties

- New church tables are prefixed `church_`; the script does not alter or drop `license_records`, `license_installations`, or `license_events`.
- The import runs in one transaction and rolls back on failure.
- It stores each record as JSONB, preserving the current data shape for the later API refactor. Expired/transient `resetCode` and `resetExpires` fields are omitted from user records.
- It writes a migration marker and source SHA-256 checksum. Running it again will report that it has already run and will not duplicate records.
- It refuses to import into any pre-existing non-empty `church_*` table if no completion marker exists.
- The script never prints the database URL.

## Install the files

Extract this kit into the root of your JCF Connect repository, preserving folders. It adds:

`server/migrations/migrate-json-to-postgres.js`

The existing project already lists `pg` and `dotenv` as dependencies.

## Run the one-time import

In PowerShell:

```powershell
cd C:\Users\Sammy\projects\jcf-connect
node .\server\migrations\migrate-json-to-postgres.js
```

The script uses `LICENSING_DATABASE_URL` from your local `.env` via `dotenv`. Do not paste that value into chat or commit `.env`.

Review the printed counts and compare them to `server/data/jcf.json` or your verified backup. The script prints counts and the source checksum only.

## Important: this is the data-import phase, not the live cutover

After a successful import, JCF Connect will still read and write `server/data/jcf.json`. Do **not** delete that file or assume the application has switched to PostgreSQL yet. The next phase must refactor `server/db.js`, authentication middleware, and routes to use asynchronous PostgreSQL operations, then test the website and desktop client before switching off JSON storage.

Do not use `--force` or manually delete migration markers. This script intentionally has no force mode.
