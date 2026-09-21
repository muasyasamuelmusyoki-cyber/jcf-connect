const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() { return db.getStore(); }

router.get('/', (req, res) => {
  res.json((store().groups || []).slice().reverse());
});

router.get('/:id', (req, res) => {
  const g = (store().groups || []).find((x) => x.id === req.params.id);
  if (!g) return res.status(404).json({ error: 'Group not found' });
  res.json(g);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.groups) s.groups = [];
  const b = req.body;
  const group = {
    id: b.id || ('GG-' + Date.now()),
    name: b.name || '',
    leader: b.leader || '',
    phone: b.phone || '',
    day: b.day || '',
    time: b.time || '',
    location: b.location || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  s.groups.push(group);
  db.saveStore();
  res.status(201).json(group);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.groups) s.groups = [];
  const i = s.groups.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Group not found' });
  const b = req.body;
  s.groups[i] = {
    ...s.groups[i],
    name: b.name || '',
    leader: b.leader || '',
    phone: b.phone || '',
    day: b.day || '',
    time: b.time || '',
    location: b.location || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  if (s.group_members) {
    s.group_members.forEach((m) => {
      if (m.group_id === req.params.id) m.group_name = s.groups[i].name;
    });
  }
  db.saveStore();
  res.json(s.groups[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.groups || []).length;
  s.groups = (s.groups || []).filter((x) => x.id !== req.params.id);
  s.group_members = (s.group_members || []).filter((m) => m.group_id !== req.params.id);
  db.saveStore();
  if ((s.groups || []).length === before) return res.status(404).json({ error: 'Group not found' });
  res.json({ ok: true });
});

module.exports = router;