const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

function normalize(row) {
  if (!row) return row;
  return {
    ...row,
    sundaySchool: row.sundaySchool != null ? row.sundaySchool : (row.sunday_school || 0),
    eventName: row.eventName || ''
  };
}

router.get('/', (req, res) => {
  const list = (store().attendance || [])
    .slice()
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map(normalize);
  res.json(list);
});

router.get('/:id', (req, res) => {
  const row = (store().attendance || []).find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Record not found' });
  res.json(normalize(row));
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.attendance) s.attendance = [];
  const b = req.body || {};
  const men = Number(b.men) || 0;
  const ladies = Number(b.ladies) || 0;
  const youths = Number(b.youths) || 0;
  const teens = Number(b.teens) || 0;
  const sundaySchool = Number(b.sundaySchool) || Number(b.sunday_school) || 0;
  const total = men + ladies + youths + teens + sundaySchool;
  const service = b.service || 'Sunday Service';
  const eventName = service === 'Special' ? String(b.eventName || '').trim() : '';

  if (service === 'Special' && !eventName) {
    return res.status(400).json({ error: 'Special event name is required' });
  }

  const record = {
    id: b.id || ('ATT-' + Date.now()),
    date: b.date || '',
    service,
    eventName,
    men,
    ladies,
    youths,
    teens,
    sundaySchool,
    total,
    createdAt: new Date().toISOString()
  };
  s.attendance.push(record);
  db.saveStore();
  res.status(201).json(normalize(record));
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.attendance) s.attendance = [];
  const i = s.attendance.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Record not found' });

  const b = req.body || {};
  const men = Number(b.men) || 0;
  const ladies = Number(b.ladies) || 0;
  const youths = Number(b.youths) || 0;
  const teens = Number(b.teens) || 0;
  const sundaySchool = Number(b.sundaySchool) || Number(b.sunday_school) || 0;
  const service = b.service || s.attendance[i].service || 'Sunday Service';
  const eventName = service === 'Special' ? String(b.eventName || '').trim() : '';

  if (service === 'Special' && !eventName) {
    return res.status(400).json({ error: 'Special event name is required' });
  }

  s.attendance[i] = {
    ...s.attendance[i],
    date: b.date || s.attendance[i].date || '',
    service,
    eventName,
    men,
    ladies,
    youths,
    teens,
    sundaySchool,
    total: men + ladies + youths + teens + sundaySchool,
    updatedAt: new Date().toISOString()
  };
  db.saveStore();
  res.json(normalize(s.attendance[i]));
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