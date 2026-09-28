const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

function ensureLeaders(s) {
  if (!Array.isArray(s.leaders)) s.leaders = [];
}

router.get('/', (req, res) => {
  const s = store();
  ensureLeaders(s);
  res.json(s.leaders.slice().reverse());
});

router.get('/:id', (req, res) => {
  const s = store();
  ensureLeaders(s);
  const row = s.leaders.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Leader not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const s = store();
  ensureLeaders(s);
  const b = req.body || {};
  if (!b.name || !b.title) {
    return res.status(400).json({ error: 'Name and title are required' });
  }
  const leader = {
    id: b.id || ('LDR-' + Date.now()),
    name: String(b.name).trim(),
    title: String(b.title).trim(),
    phone: (b.phone || '').trim(),
    email: (b.email || '').trim(),
    department: (b.department || '').trim(),
    status: b.status || 'Active',
    notes: (b.notes || '').trim(),
    createdAt: new Date().toISOString()
  };
  s.leaders.push(leader);
  db.saveStore();
  res.status(201).json(leader);
});

router.put('/:id', (req, res) => {
  const s = store();
  ensureLeaders(s);
  const i = s.leaders.findIndex((x) => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Leader not found' });
  const b = req.body || {};
  s.leaders[i] = {
    ...s.leaders[i],
    name: (b.name || s.leaders[i].name || '').trim(),
    title: (b.title || s.leaders[i].title || '').trim(),
    phone: (b.phone || '').trim(),
    email: (b.email || '').trim(),
    department: (b.department || '').trim(),
    status: b.status || s.leaders[i].status || 'Active',
    notes: (b.notes || '').trim(),
    updatedAt: new Date().toISOString()
  };
  db.saveStore();
  res.json(s.leaders[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensureLeaders(s);
  const before = s.leaders.length;
  s.leaders = s.leaders.filter((x) => String(x.id) !== String(req.params.id));
  db.saveStore();
  if (s.leaders.length === before) {
    return res.status(404).json({ error: 'Leader not found' });
  }
  res.json({ ok: true });
});

module.exports = router;