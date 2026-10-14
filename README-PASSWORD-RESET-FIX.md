# JCF Connect password reset persistence fix

## What this fixes

The login handler checks `user.passwordHash || user.password`, but the reset handler previously updated only `user.password`. For records that already contain `passwordHash`, login continued to accept the old password. Also, `db.saveStore()` rewrites all church tables, making a password reset unnecessarily slow.

This patch:
- updates both `passwordHash` and the legacy `password` field with the same bcrypt hash;
- persists the changed user JSON directly to the `church_users` PostgreSQL row;
- clears the one-time reset code, expiry, and attempt counter on success;
- reports a server error if persistence fails rather than falsely claiming success.

## Apply

1. Stop the JCF Connect server with `Ctrl+C`.
2. Back up `server/routes/auth.js` and `server/db.js`.
3. Extract this ZIP.
4. Copy the included `server` folder into `C:\Users\Sammy\projects\jcf-connect`, replacing only these two files:
   - `server\routes\auth.js`
   - `server\db.js`
5. Do not change `.env`, SMTP credentials, or the database.
6. Start the server:

   ```powershell
   cd C:\Users\Sammy\projects\jcf-connect
   npm start
   ```

## Test safely

1. Request a fresh reset code for a test account.
2. Enter the code and set a new password.
3. Confirm the page reports success and redirects to login.
4. Sign in with the new password; it should work.
5. Try the old password; it should fail.
6. If save fails, inspect the server terminal for `Password reset persistence failed` or `Church PostgreSQL password update failed`.

Never print or share a reset code, password, bcrypt hash, or `.env` file in logs/screenshots. This patch was syntax-checked but not run against your live PostgreSQL database; test it in your environment after backing up the files.
