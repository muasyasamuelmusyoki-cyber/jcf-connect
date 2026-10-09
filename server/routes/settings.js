const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

function ensure(s) {
  if (!s.settings || typeof s.settings !== 'object') s.settings = {};
  if (!s.settings.church) s.settings.church = {};
  if (!s.settings.prefs) s.settings.prefs = {};
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  res.json({
    church: s.settings.church || {},
    prefs: s.settings.prefs || {}
  });
});

router.put('/church', requireRole('Super Admin', 'Admin'), (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  s.settings.church = {
    name: String(b.name || '').trim(),
    slogan: String(b.slogan || '').trim(),
    phone: String(b.phone || '').trim(),
    email: String(b.email || '').trim(),
    website: String(b.website || '').trim(),
    address: String(b.address || '').trim(),
    about: String(b.about || '').trim()
  };
  db.saveStore();
  res.json(s.settings.church);
});
router.put('/prefs', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};

  const idleMins = Number(b.idleMins);

  s.settings.prefs = {
    dark: b.dark !== false,
    banner: b.banner !== false,
    currency: ['KES', 'USD', 'EUR'].includes(b.currency)
      ? b.currency
      : 'KES',
    idle: b.idle !== false,
    idleMins: Number.isFinite(idleMins)
      ? Math.min(60, Math.max(1, idleMins))
      : 5
  };

  db.saveStore();
  res.json(s.settings.prefs);
});

module.exports = router;