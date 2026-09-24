const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  const s = db.getStore();
  if (!s.leaders) s.leaders = [];
  return s;
}

function nextId(list) {
  const n = list.length + 1;
  return 'LDR-' + String(n).padStart(3, '0');
}

router.get('/', (req, res) => {
  const s = store();
  res.json(s.leaders.slice().reverse());
});

router.get('/:id', (req, res) => {
  const s = store();
  const item = s.leaders.find((x) => x.id === req.params.id);
  if (!item) return res.status(404).json({ error: 'Leader not found' });
  res.json(item);
});

router.post('/', (req, res) => {
  const s = store();
  const b = req.body || {};
  if (!b.name || !b.title) {
    return res.status(400).json({ error: 'Name and title are required' });
  }
  const leader = {
    id: b.id || nextId(s.leaders),
    name: String(b.name).trim(),
    title: String(b.title).trim(),
    phone: (b.phone || '').trim(),
    email: (b.email || '').trim().toLowerCase(),
    department: (b.department || '').trim(),
    memberId: (b.memberId || '').trim(),
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
  const i = s.leaders.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Leader not found' });
  const b = req.body || {};
  const cur = s.leaders[i];
  s.leaders[i] = {
    ...cur,
    name: b.name != null ? String(b.name).trim() : cur.name,
    title: b.title != null ? String(b.title).trim() : cur.title,
    phone: b.phone != null ? String(b.phone).trim() : cur.phone,
    email: b.email != null ? String(b.email).trim().toLowerCase() : cur.email,
    department: b.department != null ? String(b.department).trim() : cur.department,
    memberId: b.memberId != null ? String(b.memberId).trim() : cur.memberId,
    status: b.status || cur.status,
    notes: b.notes != null ? String(b.notes).trim() : cur.notes,
    updatedAt: new Date().toISOString()
  };
  db.saveStore();
  res.json(s.leaders[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = s.leaders.length;
  s.leaders = s.leaders.filter((x) => x.id !== req.params.id);
  if (s.leaders.length === before) return res.status(404).json({ error: 'Leader not found' });
  db.saveStore();
  res.json({ ok: true });
});

module.exports = router;