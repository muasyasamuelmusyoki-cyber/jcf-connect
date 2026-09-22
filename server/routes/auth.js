const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, authRequired } = require('../middleware/auth');
const { sendResetCode } = require('../mail');

const router = express.Router();

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

router.post('/login', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const hash = user.passwordHash || user.password;
  if (!hash || !bcrypt.compareSync(password, hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '8h' }
  );

  res.json({
    token,
    user: publicUser(user)
  });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.findUserById(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user: publicUser(user) });
});

router.post('/logout', authRequired, (req, res) => {
  res.json({ ok: true });
});

router.post('/forgot-password', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const safeReply = {
    ok: true,
    message: 'If that email exists, a reset code has been sent to your inbox.'
  };

  const user = db.findUserByEmail(email);
  if (!user) {
    return res.json(safeReply);
  }

  const code = String(Math.floor(100000 + Math.random() * 900000));
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

router.post('/reset-password', (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const code = (req.body.code || '').trim();
  const newPassword = req.body.newPassword || '';

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code and new password are required' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const store = db.getStore();
  const user = store.users.find(
    (u) => (u.email || '').toLowerCase() === email && u.status === 'Active'
  );

  if (!user || !user.resetCode || !user.resetExpires) {
    return res.status(400).json({ error: 'Invalid or expired reset code' });
  }
  if (Date.now() > user.resetExpires) {
    return res.status(400).json({ error: 'Reset code has expired. Request a new one.' });
  }
  if (String(user.resetCode) !== code) {
    return res.status(400).json({ error: 'Invalid reset code' });
  }

  user.password = bcrypt.hashSync(newPassword, 10);
  delete user.resetCode;
  delete user.resetExpires;
  db.saveStore();

  res.json({ ok: true, message: 'Password updated. You can sign in now.' });
});

module.exports = router;