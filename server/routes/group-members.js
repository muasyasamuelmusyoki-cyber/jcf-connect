const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() { return db.getStore(); }

router.get('/', (req, res) => {
  res.json((store().group_members || []).slice().reverse());
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.group_members) s.group_members = [];
  const b = req.body;
  const g = (s.groups || []).find((x) => x.id === b.groupId);
  const member = {
    id: b.id || ('GM-' + Date.now()),
    name: b.name || '',
    group_id: b.groupId || '',
    group_name: g ? g.name : '',
    phone: b.phone || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  s.group_members.push(member);
  db.saveStore();
  res.status(201).json(member);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.group_members) s.group_members = [];
  const i = s.group_members.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  const g = (s.groups || []).find((x) => x.id === b.groupId);
  s.group_members[i] = {
    ...s.group_members[i],
    name: b.name || '',
    group_id: b.groupId || '',
    group_name: g ? g.name : '',
    phone: b.phone || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  db.saveStore();
  res.json(s.group_members[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.group_members || []).length;
  s.group_members = (s.group_members || []).filter((x) => x.id !== req.params.id);
  db.saveStore();
  if ((s.group_members || []).length === before) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;