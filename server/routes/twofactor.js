const express = require('express');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();

router.post('/setup', authRequired, async (req, res) => {
  const store = db.getStore();
  const user = (store.users || []).find((u) => String(u.id) === String(req.user.id));
  if (!user) return res.status(404).json({ error: 'User not found' });

  const secret = speakeasy.generateSecret({
    name: 'JCF Connect (' + (user.email || 'user') + ')',
    length: 20
  });

  user.twoFactorTempSecret = secret.base32;
  db.saveStore();

  try {
    const qr = await QRCode.toDataURL(secret.otpauth_url);
    res.json({ secret: secret.base32, qr: qr });
  } catch (err) {
    res.status(500).json({ error: 'Could not create QR code' });
  }
});

router.post('/enable', authRequired, (req, res) => {
  const code = String(req.body.code || '').trim();
  const store = db.getStore();
  const user = (store.users || []).find((u) => String(u.id) === String(req.user.id));
  if (!user || !user.twoFactorTempSecret) {
    return res.status(400).json({ error: 'Start setup first' });
  }

  const ok = speakeasy.totp.verify({
    secret: user.twoFactorTempSecret,
    encoding: 'base32',
    token: code,
    window: 1
  });

  if (!ok) return res.status(400).json({ error: 'Invalid code. Try again.' });

  user.twoFactorSecret = user.twoFactorTempSecret;
  user.twoFactorEnabled = true;
  delete user.twoFactorTempSecret;
  db.saveStore();

  res.json({ ok: true, message: 'Two-factor authentication enabled' });
});

router.post('/disable', authRequired, (req, res) => {
  const code = String(req.body.code || '').trim();
  const store = db.getStore();
  const user = (store.users || []).find((u) => String(u.id) === String(req.user.id));
  if (!user || !user.twoFactorEnabled) {
    return res.status(400).json({ error: '2FA is not enabled' });
  }

  const ok = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token: code,
    window: 1
  });

  if (!ok) return res.status(400).json({ error: 'Invalid code' });

  user.twoFactorEnabled = false;
  delete user.twoFactorSecret;
  delete user.twoFactorTempSecret;
  db.saveStore();

  res.json({ ok: true, message: 'Two-factor authentication disabled' });
});

router.get('/status', authRequired, (req, res) => {
  const store = db.getStore();
  const user = (store.users || []).find((u) => String(u.id) === String(req.user.id));
  res.json({ enabled: !!(user && user.twoFactorEnabled) });
});

module.exports = router;