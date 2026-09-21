const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  res.json((store().dept_members || []).slice().reverse());
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.dept_members) s.dept_members = [];
  const b = req.body;
  const d = (s.departments || []).find((x) => x.id === b.deptId);
  const member = {
    id: b.id || ('DM-' + Date.now()),
    name: b.name || '',
    dept_id: b.deptId || '',
    dept_name: d ? d.name : '',
    phone: b.phone || '',
    role: b.role || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  s.dept_members.push(member);
  db.saveStore();
  res.status(201).json(member);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.dept_members) s.dept_members = [];
  const i = s.dept_members.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found' });
  const b = req.body;
  const d = (s.departments || []).find((x) => x.id === b.deptId);
  s.dept_members[i] = {
    ...s.dept_members[i],
    name: b.name || '',
    dept_id: b.deptId || '',
    dept_name: d ? d.name : '',
    phone: b.phone || '',
    role: b.role || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  db.saveStore();
  res.json(s.dept_members[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.dept_members || []).length;
  s.dept_members = (s.dept_members || []).filter((x) => x.id !== req.params.id);
  db.saveStore();
  if ((s.dept_members || []).length === before) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json({ ok: true });
});

module.exports = router;