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

function normalize(c) {
  return {
    id: c.id,
    name: c.name || '',
    teacher: c.teacher || '',
    ageGroup: c.ageGroup || c.age_group || '',
    room: c.room || '',
    status: c.status || 'Active',
    notes: c.notes || '',
    createdAt: c.createdAt || c.created_at || null,
    updatedAt: c.updatedAt || null
  };
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  res.json(s.champs_classes.map(normalize).reverse());
});

router.get('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const row = s.champs_classes.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Class not found' });
  res.json(normalize(row));
});

router.post('/', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  if (!b.name || !String(b.name).trim()) {
    return res.status(400).json({ error: 'Class name is required' });
  }
  if (!b.teacher || !String(b.teacher).trim()) {
    return res.status(400).json({ error: 'Teacher is required' });
  }

  const record = {
    id: b.id || ('CLS-' + Date.now()),
    name: String(b.name).trim(),
    teacher: String(b.teacher).trim(),
    ageGroup: (b.ageGroup || b.age_group || '').trim(),
    room: (b.room || '').trim(),
    status: b.status || 'Active',
    notes: (b.notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  s.champs_classes.push(record);
  db.saveStore();
  res.status(201).json(normalize(record));
});

router.put('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const i = s.champs_classes.findIndex((x) => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Class not found' });

  const b = req.body || {};
  const cur = s.champs_classes[i];
  s.champs_classes[i] = {
    ...cur,
    name: b.name != null ? String(b.name).trim() : cur.name,
    teacher: b.teacher != null ? String(b.teacher).trim() : cur.teacher,
    ageGroup: b.ageGroup != null || b.age_group != null
      ? String(b.ageGroup || b.age_group || '').trim()
      : (cur.ageGroup || ''),
    room: b.room != null ? String(b.room).trim() : (cur.room || ''),
    status: b.status || cur.status || 'Active',
    notes: b.notes != null ? String(b.notes).trim() : (cur.notes || ''),
    updatedAt: new Date().toISOString()
  };
  db.saveStore();
  res.json(normalize(s.champs_classes[i]));
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const id = String(req.params.id);
  const before = s.champs_classes.length;
  s.champs_classes = s.champs_classes.filter((x) => String(x.id) !== id);
  // Unassign students from deleted class
  s.champs_students = (s.champs_students || []).map((st) => {
    if (String(st.classId || st.class_id) === id) {
      return { ...st, classId: '', className: '' };
    }
    return st;
  });
  db.saveStore();
  if (s.champs_classes.length === before) {
    return res.status(404).json({ error: 'Class not found' });
  }
  res.json({ ok: true });
});

module.exports = router;