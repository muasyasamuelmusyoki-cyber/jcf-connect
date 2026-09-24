const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Download database backup without authentication secrets.
router.get('/export', requireRole('Super Admin', 'Admin'), (req, res) => {
  const data = db.getStore();
  const safe = JSON.parse(JSON.stringify(data));

  // Never include authentication secrets in downloadable backups.
  (safe.users || []).forEach((u) => {
    delete u.password;
    delete u.passwordHash;
    delete u.twoFactorSecret;
  });

  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="jcf-backup-' + new Date().toISOString().slice(0, 10) + '.json"'
  );

  res.send(JSON.stringify(safe, null, 2));
});

module.exports = router;
