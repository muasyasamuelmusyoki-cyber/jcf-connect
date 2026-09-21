const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  res.json((store().champs_students || []).slice().reverse());
});

router.get('/:id', (req, res) => {
  const row = (store().champs_students || []).find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Student not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.champs_students) s.champs_students = [];
  const b = req.body || {};
  const cls = (s.champs_classes || []).find((x) => x.id === b.classId);
  const row = {
    id: b.id || ('STU-' + Date.now()),
    name: b.name || '',
    class_id: b.classId || '',
    class_name: cls ? cls.name : (b.className || ''),
    phone: b.phone || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  s.champs_students.push(row);
  db.saveStore();
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.champs_students) s.champs_students = [];
  const i = s.champs_students.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Student not found' });
  const b = req.body || {};
  const cls = (s.champs_classes || []).find((x) => x.id === b.classId);
  s.champs_students[i] = {
    ...s.champs_students[i],
    name: b.name || '',
    class_id: b.classId || '',
    class_name: cls ? cls.name : (b.className || ''),
    phone: b.phone || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  db.saveStore();
  res.json(s.champs_students[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.champs_students || []).length;
  s.champs_students = (s.champs_students || []).filter((x) => x.id !== req.params.id);
  db.saveStore();
  if ((s.champs_students || []).length === before) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json({ ok: true });
});

module.exports = router;