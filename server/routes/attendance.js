const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  const list = (store().attendance || []).slice().sort((a, b) =>
    (b.date || '').localeCompare(a.date || '')
  );
  res.json(list);
});

router.get('/:id', (req, res) => {
  const row = (store().attendance || []).find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Record not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.attendance) s.attendance = [];
  const b = req.body;
  const men = Number(b.men) || 0;
  const ladies = Number(b.ladies) || 0;
  const youths = Number(b.youths) || 0;
  const teens = Number(b.teens) || 0;
  const sundaySchool = Number(b.sundaySchool) || Number(b.sunday_school) || 0;
  const total = men + ladies + youths + teens + sundaySchool;

  const record = {
    id: b.id || ('ATT-' + Date.now()),
    date: b.date || '',
    service: b.service || 'Sunday Service',
    men,
    ladies,
    youths,
    teens,
    sunday_school: sundaySchool,
    total,
    created_at: new Date().toISOString()
  };
  s.attendance.push(record);
  db.saveStore();
  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.attendance) s.attendance = [];
  const i = s.attendance.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Record not found' });
  const b = req.body;
  const men = Number(b.men) || 0;
  const ladies = Number(b.ladies) || 0;
  const youths = Number(b.youths) || 0;
  const teens = Number(b.teens) || 0;
  const sundaySchool = Number(b.sundaySchool) || Number(b.sunday_school) || 0;

  s.attendance[i] = {
    ...s.attendance[i],
    date: b.date || '',
    service: b.service || 'Sunday Service',
    men,
    ladies,
    youths,
    teens,
    sunday_school: sundaySchool,
    total: men + ladies + youths + teens + sundaySchool
  };
  db.saveStore();
  res.json(s.attendance[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.attendance || []).length;
  s.attendance = (s.attendance || []).filter((x) => x.id !== req.params.id);
  db.saveStore();
  if ((s.attendance || []).length === before) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ ok: true });
});

module.exports = router;