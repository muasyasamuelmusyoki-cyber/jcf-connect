# JCF Connect — Forgot Password Email Setup

The supplied `pages/forgot-password.html` already calls these API routes:
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

The supplied `server/routes/auth.js` already calls `sendResetCode()` from `server/mail.js`. This patch supplies a Nodemailer SMTP implementation for that missing/unverified module.

## 1. Install dependencies

Run from the JCF Connect project root:

```powershell
npm install
```

Nodemailer is already listed in the supplied `package.json`; if your local installation is missing it, run:

```powershell
npm install nodemailer
```

## 2. Add SMTP settings to the existing server `.env`

Do not replace the whole `.env` file. Add these lines, filling in values from your email provider:

```dotenv
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=your.full.email@gmail.com
SMTP_PASS=your_16_character_google_app_password
MAIL_FROM=JCF Connect <your.full.email@gmail.com>
```

For Gmail, use a Google App Password (requires 2-Step Verification), not your normal Google account password. For another email provider, use that provider's SMTP host, port, and credentials. Never share the `.env` file or upload it.

## 3. Copy the mailer

Stop the app. Back up the current `server/mail.js` if it exists, then copy this patch's `server/mail.js` to:

`C:\Users\Sammy\projects\jcf-connect\server\mail.js`

This mailer uses the existing `sendResetCode(to, code, name)` signature in `server/routes/auth.js`.

## 4. Restart

```powershell
cd C:\Users\Sammy\projects\jcf-connect
npm start
```

## 5. Test

1. Use a real active test account whose email you can access.
2. Open the Forgot Password page and request a code.
3. Check Inbox and Spam/Junk.
4. Enter the six-digit code within 10 minutes and set a new password.
5. Confirm the new password logs in and the old password does not.
6. Confirm an incorrect code is rejected and after five wrong attempts a new code is required.

## Troubleshooting

- `Email is not configured`: one or more SMTP variables are missing or blank.
- `Invalid login` / `535`: SMTP credentials are wrong; with Gmail, create an App Password and use it as `SMTP_PASS`.
- `ECONNECTION` / timeout: check host, port, secure mode, firewall, and provider SMTP access.
- Email accepted but not received: check Spam/Junk, recipient spelling, and provider delivery logs.

The browser intentionally receives a generic success message whether or not an account exists, to avoid exposing registered email addresses. The server should log only the error message if delivery fails; never log the reset code or SMTP password.
