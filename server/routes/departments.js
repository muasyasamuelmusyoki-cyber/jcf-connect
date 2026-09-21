const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  res.json((store().departments || []).slice().reverse());
});

router.get('/:id', (req, res) => {
  const d = (store().departments || []).find((x) => x.id === req.params.id);
  if (!d) return res.status(404).json({ error: 'Department not found' });
  res.json(d);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.departments) s.departments = [];
  const b = req.body;
  const dept = {
    id: b.id || ('DEP-' + Date.now()),
    name: b.name || '',
    leader: b.leader || '',
    phone: b.phone || '',
    email: b.email || '',
    meeting_day: b.meetingDay || b.meeting_day || '',
    meeting_time: b.meetingTime || b.meeting_time || '',
    status: b.status || 'Active',
    description: b.description || ''
  };
  s.departments.push(dept);
  db.saveStore();
  res.status(201).json(dept);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.departments) s.departments = [];
  const i = s.departments.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Department not found' });
  const b = req.body;
  s.departments[i] = {
    ...s.departments[i],
    name: b.name || '',
    leader: b.leader || '',
    phone: b.phone || '',
    email: b.email || '',
    meeting_day: b.meetingDay || b.meeting_day || '',
    meeting_time: b.meetingTime || b.meeting_time || '',
    status: b.status || 'Active',
    description: b.description || ''
  };
  if (s.dept_members) {
    s.dept_members.forEach((m) => {
      if (m.dept_id === req.params.id) m.dept_name = s.departments[i].name;
    });
  }
  db.saveStore();
  res.json(s.departments[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.departments || []).length;
  s.departments = (s.departments || []).filter((x) => x.id !== req.params.id);
  s.dept_members = (s.dept_members || []).filter((m) => m.dept_id !== req.params.id);
  db.saveStore();
  if ((s.departments || []).length === before) {
    return res.status(404).json({ error: 'Department not found' });
  }
  res.json({ ok: true });
});

module.exports = router;