const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

function ensure(s) {
  if (!Array.isArray(s.champs_classes)) s.champs_classes = [];
  if (!Array.isArray(s.champs_students)) s.champs_students = [];
}

function classNameFor(s, classId) {
  if (!classId) return '';
  const c = (s.champs_classes || []).find((x) => String(x.id) === String(classId));
  return c ? (c.name || '') : '';
}

function normalize(st, s) {
  const classId = st.classId || st.class_id || '';
  return {
    id: st.id,
    name: st.name || '',
    classId: classId,
    className: st.className || st.class_name || classNameFor(s, classId),
    phone: st.phone || '',
    parentName: st.parentName || st.parent_name || '',
    dob: st.dob || '',
    status: st.status || 'Active',
    notes: st.notes || '',
    createdAt: st.createdAt || st.created_at || null
  };
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  res.json(s.champs_students.map((st) => normalize(st, s)).reverse());
});

router.get('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const row = s.champs_students.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Student not found' });
  res.json(normalize(row, s));
});

router.post('/', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) {
    return res.status(400).json({ error: 'Student name is required' });
  }

  const classId = b.classId || b.class_id || '';
  const record = {
    id: b.id || ('STU-' + Date.now()),
    name: String(b.name).trim(),
    classId: classId,
    className: b.className || b.class_name || classNameFor(s, classId),
    phone: (b.phone || '').trim(),
    parentName: (b.parentName || b.parent_name || '').trim(),
    dob: b.dob || '',
    status: b.status || 'Active',
    notes: (b.notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  s.champs_students.push(record);
  db.saveStore();
  res.status(201).json(normalize(record, s));
});

router.put('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const i = s.champs_students.findIndex((x) => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Student not found' });

  const b = req.body || {};
  const cur = s.champs_students[i];
  const classId =
    b.classId != null || b.class_id != null
      ? String(b.classId || b.class_id || '')
      : (cur.classId || cur.class_id || '');

  s.champs_students[i] = {
    ...cur,
    name: b.name != null ? String(b.name).trim() : cur.name,
    classId: classId,
    className:
      b.className != null || b.class_name != null
        ? String(b.className || b.class_name || '')
        : classNameFor(s, classId) || cur.className || '',
    phone: b.phone != null ? String(b.phone).trim() : (cur.phone || ''),
    parentName:
      b.parentName != null || b.parent_name != null
        ? String(b.parentName || b.parent_name || '').trim()
        : (cur.parentName || ''),
    dob: b.dob != null ? b.dob : (cur.dob || ''),
    status: b.status || cur.status || 'Active',
    notes: b.notes != null ? String(b.notes).trim() : (cur.notes || ''),
    updatedAt: new Date().toISOString()
  };

  db.saveStore();
  res.json(normalize(s.champs_students[i], s));
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const before = s.champs_students.length;
  s.champs_students = s.champs_students.filter(
    (x) => String(x.id) !== String(req.params.id)
  );
  db.saveStore();
  if (s.champs_students.length === before) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json({ ok: true });
});

module.exports = router;