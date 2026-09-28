const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}
function ensure(s) {
  if (!Array.isArray(s.departments)) s.departments = [];
  if (!Array.isArray(s.dept_members)) s.dept_members = [];
}

function deptName(s, deptId) {
  const d = (s.departments || []).find((x) => String(x.id) === String(deptId));
  return d ? d.name : '';
}

function normalize(m, s) {
  const deptId = m.deptId || m.dept_id || '';
  return {
    id: m.id,
    name: m.name || '',
    deptId: deptId,
    deptName: m.deptName || m.dept_name || deptName(s, deptId),
    phone: m.phone || '',
    role: m.role || '',
    status: m.status || 'Active',
    notes: m.notes || ''
  };
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  res.json(s.dept_members.map((m) => normalize(m, s)).reverse());
});

router.get('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const row = s.dept_members.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Member not found' });
  res.json(normalize(row, s));
});

router.post('/', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  if (!b.name || !(b.deptId || b.dept_id)) {
    return res.status(400).json({ error: 'Name and department are required' });
  }
  const deptId = b.deptId || b.dept_id;
  const record = {
    id: b.id || ('DM-' + Date.now()),
    name: String(b.name).trim(),
    deptId: deptId,
    deptName: b.deptName || b.dept_name || deptName(s, deptId),
    phone: (b.phone || '').trim(),
    role: (b.role || '').trim(),
    status: b.status || 'Active',
    notes: (b.notes || '').trim(),
    createdAt: new Date().toISOString()
  };
  s.dept_members.push(record);
  db.saveStore();
  res.status(201).json(normalize(record, s));
});

router.put('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const i = s.dept_members.findIndex((x) => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Member not found' });
  const b = req.body || {};
  const cur = s.dept_members[i];
  const deptId =
    b.deptId != null || b.dept_id != null
      ? String(b.deptId || b.dept_id)
      : (cur.deptId || cur.dept_id || '');
  s.dept_members[i] = {
    ...cur,
    name: b.name != null ? String(b.name).trim() : cur.name,
    deptId: deptId,
    deptName: deptName(s, deptId) || cur.deptName || '',
    phone: b.phone != null ? String(b.phone).trim() : (cur.phone || ''),
    role: b.role != null ? String(b.role).trim() : (cur.role || ''),
    status: b.status || cur.status || 'Active',
    notes: b.notes != null ? String(b.notes).trim() : (cur.notes || ''),
    updatedAt: new Date().toISOString()
  };
  db.saveStore();
  res.json(normalize(s.dept_members[i], s));
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const before = s.dept_members.length;
  s.dept_members = s.dept_members.filter(
    (x) => String(x.id) !== String(req.params.id)
  );
  db.saveStore();
  if (s.dept_members.length === before) {
    return res.status(404).json({ error: 'Member not found' });
  }
  res.json({ ok: true });
});

module.exports = router;