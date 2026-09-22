const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const store = db.getStore();
  res.json(store.settings || {});
});

router.put('/', requireRole('Super Admin', 'Admin'), (req, res) => {
  const store = db.getStore();
  store.settings = { ...(store.settings || {}), ...(req.body || {}) };
  db.saveStore();
  res.json(store.settings);
});

module.exports = router;