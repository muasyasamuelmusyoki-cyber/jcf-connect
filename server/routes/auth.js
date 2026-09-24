const { verifyRecaptcha } = require('../recaptcha');

const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomInt } = require('crypto');
const speakeasy = require('speakeasy');
const db = require('../db');
const { JWT_SECRET, authRequired } = require('../middleware/auth');
const { sendResetCode } = require('../mail');

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many login attempts. Please try again later.' } });

const twoFactorLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many verification attempts. Please try again later.' } });

const passwordResetLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many password reset requests. Please try again later.' } });

function userAccess(user) {
  if (Array.isArray(user.access) && user.access.length) return user.access;
  if (user.role === 'Super Admin') return ['*'];
  return [];
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status || 'Active',
    access: userAccess(user)
  };
}

// LOGIN
router.post('/login', loginLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';
  const recaptchaToken = req.body.recaptchaToken || '';

  // Verify Google reCAPTCHA
  const recaptchaOk = await verifyRecaptcha(recaptchaToken);

  if (!recaptchaOk) {
    return res.status(400).json({
      error: 'reCAPTCHA verification failed. Please try again.'
    });
  }

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password required'
    });
  }

  const user = db.findUserByEmail(email);

  if (!user) {
    return res.status(401).json({
      error: 'Invalid email or password'
    });
  }

  const hash = user.passwordHash || user.password;

  if (!hash || !bcrypt.compareSync(password, hash)) {
    return res.status(401).json({
      error: 'Invalid email or password'
    });
  }

  // TWO-FACTOR AUTHENTICATION
  if (user.twoFactorEnabled && user.twoFactorSecret) {
    const pendingToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        purpose: '2fa'
      },
      JWT_SECRET,
      {
        expiresIn: '5m'
      }
    );

    return res.json({
      requires2FA: true,
      pendingToken: pendingToken
    });
  }

  // Normal login
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: '8h'
    }
  );

  res.json({
    token: token,
    user: publicUser(user)
  });
});

// VERIFY 2FA
router.post('/verify-2fa', twoFactorLimiter, (req, res) => {
  const pendingToken = req.body.pendingToken || '';
  const code = String(req.body.code || '').trim();

  if (!pendingToken || !code) {
    return res.status(400).json({
      error: 'Code required'
    });
  }

  let payload;

  try {
    payload = jwt.verify(pendingToken, JWT_SECRET);
  } catch (e) {
    return res.status(401).json({
      error: 'Session expired. Login again.'
    });
  }

  if (payload.purpose !== '2fa') {
    return res.status(401).json({
      error: 'Invalid session'
    });
  }

  const store = db.getStore();

  const user = (store.users || []).find(
    (u) => String(u.id) === String(payload.id)
  );

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({
      error: '2FA not available'
    });
  }

  const ok = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1
  });

  if (!ok) {
    return res.status(401).json({
      error: 'Invalid authentication code'
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    {
      expiresIn: '8h'
    }
  );

  res.json({
    token: token,
    user: publicUser(user)
  });
});

// CURRENT USER
router.get('/me', authRequired, (req, res) => {
  const user = db.findUserById(req.user.id);

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  res.json({
    user: publicUser(user)
  });
});

// LOGOUT
router.post('/logout', authRequired, (req, res) => {
  res.json({
    ok: true
  });
});

// FORGOT PASSWORD
router.post('/forgot-password', passwordResetLimiter, async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({
      error: 'Email is required'
    });
  }

  const safeReply = {
    ok: true,
    message: 'If that email exists, a reset code has been sent to your inbox.'
  };

  const user = db.findUserByEmail(email);

  if (!user) {
    return res.json(safeReply);
  }

  const code = String(randomInt(100000, 1000000));

  const store = db.getStore();
  const u = store.users.find((x) => x.id === user.id);

  if (u) {
    u.resetCode = code;
    u.resetExpires = Date.now() + 10 * 60 * 1000;
    db.saveStore();
  }

  try {
    await sendResetCode(user.email, code, user.name);

    return res.json(safeReply);
  } catch (err) {
    console.error('Email send failed:', err.message);

    return res.status(500).json({
      error: 'Could not send email. Check SMTP settings in .env'
    });
  }
});

// RESET PASSWORD
router.post('/reset-password', passwordResetLimiter, (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code = (req.body.code || '').trim();
  const newPassword = req.body.newPassword || '';

  if (!email || !code || !newPassword) {
    return res.status(400).json({
      error: 'Email, code and new password are required'
    });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters'
    });
  }

  const store = db.getStore();

  const user = store.users.find(
    (u) =>
      (u.email || '').toLowerCase() === email &&
      u.status === 'Active'
  );

  if (!user || !user.resetCode || !user.resetExpires) {
    return res.status(400).json({
      error: 'Invalid or expired reset code'
    });
  }

  if (Date.now() > user.resetExpires) {
    return res.status(400).json({
      error: 'Reset code has expired. Request a new one.'
    });
  }

  if (String(user.resetCode) !== code) {
    return res.status(400).json({
      error: 'Invalid reset code'
    });
  }

  user.password = bcrypt.hashSync(newPassword, 10);

  delete user.resetCode;
  delete user.resetExpires;

  db.saveStore();

  res.json({
    ok: true,
    message: 'Password updated. You can sign in now.'
  });
});

module.exports = router;
