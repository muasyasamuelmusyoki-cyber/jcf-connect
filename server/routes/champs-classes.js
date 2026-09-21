const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  res.json((store().champs_classes || []).slice().reverse());
});

router.get('/:id', (req, res) => {
  const row = (store().champs_classes || []).find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Class not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.champs_classes) s.champs_classes = [];
  const b = req.body || {};
  const row = {
    id: b.id || ('CLS-' + Date.now()),
    name: b.name || '',
    teacher: b.teacher || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  s.champs_classes.push(row);
  db.saveStore();
  res.status(201).json(row);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.champs_classes) s.champs_classes = [];
  const i = s.champs_classes.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Class not found' });
  const b = req.body || {};
  s.champs_classes[i] = {
    ...s.champs_classes[i],
    name: b.name || '',
    teacher: b.teacher || '',
    status: b.status || 'Active',
    notes: b.notes || ''
  };
  if (s.champs_students) {
    s.champs_students.forEach((st) => {
      if (st.class_id === req.params.id) st.class_name = s.champs_classes[i].name;
    });
  }
  db.saveStore();
  res.json(s.champs_classes[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.champs_classes || []).length;
  s.champs_classes = (s.champs_classes || []).filter((x) => x.id !== req.params.id);
  if (s.champs_students) {
    s.champs_students.forEach((st) => {
      if (st.class_id === req.params.id) {
        st.class_id = '';
        st.class_name = '';
      }
    });
  }
  db.saveStore();
  if ((s.champs_classes || []).length === before) {
    return res.status(404).json({ error: 'Class not found' });
  }
  res.json({ ok: true });
});

module.exports = router;