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

function normalize(d) {
  return {
    id: d.id,
    name: d.name || '',
    leader: d.leader || '',
    phone: d.phone || '',
    email: d.email || '',
    meetingDay: d.meetingDay || d.meeting_day || '',
    meetingTime: d.meetingTime || d.meeting_time || '',
    status: d.status || 'Active',
    description: d.description || ''
  };
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  res.json(s.departments.map(normalize).reverse());
});

router.get('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const row = s.departments.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Department not found' });
  res.json(normalize(row));
});

router.post('/', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  if (!b.name || !b.leader) {
    return res.status(400).json({ error: 'Name and leader are required' });
  }
  const record = {
    id: b.id || ('DEP-' + Date.now()),
    name: String(b.name).trim(),
    leader: String(b.leader).trim(),
    phone: (b.phone || '').trim(),
    email: (b.email || '').trim(),
    meetingDay: b.meetingDay || b.meeting_day || '',
    meetingTime: b.meetingTime || b.meeting_time || '',
    status: b.status || 'Active',
    description: (b.description || '').trim(),
    createdAt: new Date().toISOString()
  };
  s.departments.push(record);
  db.saveStore();
  res.status(201).json(normalize(record));
});

router.put('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const i = s.departments.findIndex((x) => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Department not found' });
  const b = req.body || {};
  const cur = s.departments[i];
  s.departments[i] = {
    ...cur,
    name: b.name != null ? String(b.name).trim() : cur.name,
    leader: b.leader != null ? String(b.leader).trim() : cur.leader,
    phone: b.phone != null ? String(b.phone).trim() : cur.phone,
    email: b.email != null ? String(b.email).trim() : cur.email,
    meetingDay: b.meetingDay != null || b.meeting_day != null
      ? (b.meetingDay || b.meeting_day || '')
      : (cur.meetingDay || cur.meeting_day || ''),
    meetingTime: b.meetingTime != null || b.meeting_time != null
      ? (b.meetingTime || b.meeting_time || '')
      : (cur.meetingTime || cur.meeting_time || ''),
    status: b.status || cur.status || 'Active',
    description: b.description != null ? String(b.description).trim() : (cur.description || ''),
    updatedAt: new Date().toISOString()
  };
  db.saveStore();
  res.json(normalize(s.departments[i]));
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const id = String(req.params.id);
  const before = s.departments.length;
  s.departments = s.departments.filter((x) => String(x.id) !== id);
  s.dept_members = (s.dept_members || []).filter(
    (m) => String(m.deptId || m.dept_id) !== id
  );
  db.saveStore();
  if (s.departments.length === before) {
    return res.status(404).json({ error: 'Department not found' });
  }
  res.json({ ok: true });
});

module.exports = router;