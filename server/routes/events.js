const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  res.json((store().events || []).slice().reverse());
});

router.get('/:id', (req, res) => {
  const row = (store().events || []).find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Event not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.events) s.events = [];
  const b = req.body || {};
  const event = {
    id: b.id || ('EVT-' + Date.now()),
    title: b.title || '',
    type: b.type || '',
    date: b.date || '',
    end_date: b.endDate || b.end_date || '',
    start_time: b.startTime || b.start_time || '',
    end_time: b.endTime || b.end_time || '',
    venue: b.venue || '',
    description: b.description || '',
    status: b.status || 'Planned',
    expected_attendance: Number(b.expectedAttendance || b.expected_attendance) || 0,
    organizer: b.organizer || '',
    department: b.department || '',
    notes: b.notes || ''
  };
  s.events.push(event);
  db.saveStore();
  res.status(201).json(event);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.events) s.events = [];
  const i = s.events.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Event not found' });
  const b = req.body || {};
  s.events[i] = {
    ...s.events[i],
    title: b.title || '',
    type: b.type || '',
    date: b.date || '',
    end_date: b.endDate || b.end_date || '',
    start_time: b.startTime || b.start_time || '',
    end_time: b.endTime || b.end_time || '',
    venue: b.venue || '',
    description: b.description || '',
    status: b.status || 'Planned',
    expected_attendance: Number(b.expectedAttendance || b.expected_attendance) || 0,
    organizer: b.organizer || '',
    department: b.department || '',
    notes: b.notes || ''
  };
  db.saveStore();
  res.json(s.events[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.events || []).length;
  s.events = (s.events || []).filter((x) => x.id !== req.params.id);
  db.saveStore();
  if ((s.events || []).length === before) {
    return res.status(404).json({ error: 'Event not found' });
  }
  res.json({ ok: true });
});

module.exports = router;