# JCF Connect PostgreSQL API cutover (review build)

This build changes the church-data layer to use the existing `LICENSING_DATABASE_URL` connection and the `church_*` tables created by the one-time import. It does not change the license tables or licensing service.

## Important first: restore the two omitted group rows

The first import output did not include `groups`, even though `server/data/jcf.json` contains two groups. The API now expects `church_groups`, so repair that collection before starting the new API:

```powershell
node .\server\migrations\repair-missing-groups.js
```

The repair only creates/fills `church_groups` and updates the church migration's `row_counts` marker. It checks for existing conflicting data and refuses to overwrite it. It does not drop or alter any `license_*` tables.

## Run locally before deploying

1. Keep your existing `.env` in the project root. Never upload or commit it.
2. Make sure `LICENSING_DATABASE_URL` points to the same Render PostgreSQL database used for licensing and `JWT_SECRET` is configured to at least 32 bytes.
3. Run the repair command above.
4. Run syntax checks:

```powershell
Get-ChildItem .\server -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

5. Start the API:

```powershell
npm start
```

6. Confirm the console says `Church data loaded from PostgreSQL.` and the API is listening. Then test login and the members, groups, finance, attendance, settings, reports, and licensing screens.

## Design note

To minimize risk to the existing route behavior, this transition keeps the current synchronous store-shaped route logic in a single-process memory cache loaded from PostgreSQL at startup. Every mutating route now awaits a serialized, transactional write of the full church snapshot back to the `church_*` tables. This is a cutover bridge for the current small dataset and one Render web-service instance; do not horizontally scale multiple instances until the data layer is replaced with row-level PostgreSQL queries or a shared concurrency-safe repository.

The `license_records`, `license_installations`, and `license_events` tables are not touched by church writes. The existing JSON file remains in the project as a recovery reference and is not used as the live database after this cutover.

## Before production

- Test all API routes and the Electron desktop app locally against PostgreSQL.
- Deploy only after local tests pass.
- Keep a verified backup of `server/data/jcf.json` and a PostgreSQL backup.
- Rotate any credentials that were previously exposed in source, chat, or logs.
