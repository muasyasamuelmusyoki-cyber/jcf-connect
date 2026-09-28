const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

function ensure(s) {
  if (!Array.isArray(s.attendance)) s.attendance = [];
}

function normalize(row) {
  const men = Number(row.men) || 0;
  const ladies = Number(row.ladies) || 0;
  const youths = Number(row.youths) || 0;
  const teens = Number(row.teens) || 0;
  const sundaySchool =
    Number(row.sundaySchool) || Number(row.sunday_school) || 0;
  return {
    id: row.id,
    date: row.date || '',
    service: row.service || 'Sunday Service',
    eventName: row.eventName || row.event_name || '',
    men,
    ladies,
    youths,
    teens,
    sundaySchool,
    sunday_school: sundaySchool,
    total:
      Number(row.total) ||
      men + ladies + youths + teens + sundaySchool,
    createdAt: row.createdAt || row.created_at || null,
    updatedAt: row.updatedAt || null
  };
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  const list = s.attendance
    .map(normalize)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  res.json(list);
});

router.get('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const row = s.attendance.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Record not found' });
  res.json(normalize(row));
});

router.post('/', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  const service = b.service || 'Sunday Service';
  const eventName = (b.eventName || b.event_name || '').trim();

  if (service === 'Special' && !eventName) {
    return res.status(400).json({ error: 'Special event name is required' });
  }

  const men = Number(b.men) || 0;
  const ladies = Number(b.ladies) || 0;
  const youths = Number(b.youths) || 0;
  const teens = Number(b.teens) || 0;
  const sundaySchool =
    Number(b.sundaySchool) || Number(b.sunday_school) || 0;
  const total = men + ladies + youths + teens + sundaySchool;

  if (!b.date) {
    return res.status(400).json({ error: 'Date is required' });
  }
  if (total === 0) {
    return res.status(400).json({ error: 'Enter at least one count' });
  }

  const record = {
    id: b.id || ('ATT-' + Date.now()),
    date: b.date,
    service,
    eventName: service === 'Special' ? eventName : '',
    men,
    ladies,
    youths,
    teens,
    sundaySchool,
    sunday_school: sundaySchool,
    total,
    createdAt: new Date().toISOString()
  };

  s.attendance.push(record);
  db.saveStore();
  res.status(201).json(normalize(record));
});

router.put('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const i = s.attendance.findIndex(
    (x) => String(x.id) === String(req.params.id)
  );
  if (i === -1) return res.status(404).json({ error: 'Record not found' });

  const b = req.body || {};
  const service = b.service || s.attendance[i].service || 'Sunday Service';
  const eventName = (b.eventName || b.event_name || '').trim();

  if (service === 'Special' && !eventName) {
    return res.status(400).json({ error: 'Special event name is required' });
  }

  const men = Number(b.men) || 0;
  const ladies = Number(b.ladies) || 0;
  const youths = Number(b.youths) || 0;
  const teens = Number(b.teens) || 0;
  const sundaySchool =
    Number(b.sundaySchool) || Number(b.sunday_school) || 0;

  s.attendance[i] = {
    ...s.attendance[i],
    date: b.date || s.attendance[i].date,
    service,
    eventName: service === 'Special' ? eventName : '',
    men,
    ladies,
    youths,
    teens,
    sundaySchool,
    sunday_school: sundaySchool,
    total: men + ladies + youths + teens + sundaySchool,
    updatedAt: new Date().toISOString()
  };

  db.saveStore();
  res.json(normalize(s.attendance[i]));
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const before = s.attendance.length;
  s.attendance = s.attendance.filter(
    (x) => String(x.id) !== String(req.params.id)
  );
  db.saveStore();
  if (s.attendance.length === before) {
    return res.status(404).json({ error: 'Record not found' });
  }
  res.json({ ok: true });
});

module.exports = router;