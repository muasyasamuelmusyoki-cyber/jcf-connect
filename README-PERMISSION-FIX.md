# JCF Connect — Permission Fix Patch

## Policy implemented
- Only Super Admin can create users and assign/change roles or module permissions.
- Only Super Admin can delete users.
- Admins may edit ordinary users' profile/status/password fields, but server rejects any role/access field in their update request.
- Super Admin always receives `['*']`; all other roles receive only valid, explicitly assigned module keys. A non-Super-Admin wildcard is ignored.
- Protected module APIs check permissions server-side, including group-member, department-member, and Champs child endpoints.
- Settings writes require the `settings` module. The settings read endpoint allows `dashboard` OR `settings` so authorized dashboard users can load global display settings.
- License management requires the `licenses` module and Admin/Super Admin role.
- The browser refreshes the session from `/api/auth/me` before enforcing page permissions, hides restricted navigation, and denies unmapped protected HTML pages. Login and forgot-password remain public.

## Apply safely
1. Stop JCF Connect.
2. Back up the current project folder and database/store file.
3. Copy the contents of this patch folder into the matching paths in the project root, allowing the listed files to be replaced. Do not replace unrelated files.
4. Ensure the existing `.env` remains in place and `JWT_SECRET` is configured to at least 32 bytes. This patch does not include secrets or `.env`.
5. Start the app with the existing command (`npm start` from the project root).
6. Sign out and sign back in as Super Admin. Existing non-Super-Admin accounts with no valid `access` keys will have no module access until Super Admin assigns their modules.

## Verification checklist
1. Sign in as Super Admin and create a test user with only `dashboard` and `members` access.
2. Sign in as that test user in a private/incognito window. Dashboard and Members should be accessible; other module links should be hidden and direct page navigation should redirect.
3. With that user's token, call `GET /api/finance` and `GET /api/assets`; both should return HTTP 403. `GET /api/members` should be permitted.
4. Attempt `PUT /api/users/<id>` as Admin with `{ "role": "Super Admin" }` or an `access` field; it should return HTTP 403.
5. Attempt `POST /api/users` as Admin; it should return HTTP 403. The same request as Super Admin should succeed.
6. As Super Admin, change a user's access while they are logged in. On their next page load, `/api/auth/me` refreshes their local session permissions.
7. Confirm license API access requires the `licenses` key and an Admin/Super Admin role.

## Validation performed
- `node --check` passed for server JavaScript and page JavaScript files.
- Inline JavaScript syntax checks passed for all HTML pages.
- Static checks confirmed module guards are present on 14 module API route files.
- Runtime integration tests were not run because this source-only patch does not include dependencies, `.env`, or the application's live data store.

## Important architecture note
The app serves HTML through Express static middleware. Browser navigation cannot send a token stored only in `localStorage`, so the page guard redirects after the HTML shell loads; protected data/actions are enforced by server-side API guards and return HTTP 401/403. If the requirement is for the HTML document request itself to return HTTP 403 before any shell is delivered, the app needs a secure HttpOnly-cookie session (or another server-verifiable navigation credential) and server-side page middleware. Static HTML should not contain secrets.
