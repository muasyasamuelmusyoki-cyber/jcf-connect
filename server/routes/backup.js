const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

// Download full database JSON (Super Admin / Admin only)
router.get('/export', requireRole('Super Admin', 'Admin'), (req, res) => {
  const data = db.getStore();
  const safe = JSON.parse(JSON.stringify(data));
  // Never export password hashes in a public API if you prefer — optional strip:
  // (safe.users || []).forEach((u) => { delete u.password; delete u.passwordHash; delete u.twoFactorSecret; });
  res.setHeader('Content-Type', 'application/json');
  res.setHeader(
    'Content-Disposition',
    'attachment; filename="jcf-backup-' + new Date().toISOString().slice(0, 10) + '.json"'
  );
  res.send(JSON.stringify(safe, null, 2));
});

module.exports = router;