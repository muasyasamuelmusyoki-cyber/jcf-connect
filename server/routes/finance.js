const express = require('express');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);
router.use(requireRole('Super Admin', 'Admin'));

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  const list = (store().finance || []).slice().sort(function (a, b) {
    return (b.date || '').localeCompare(a.date || '');
  });

  res.json(list);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.finance) s.finance = [];

  const b = req.body || {};

  const record = {
    id: b.id || ('FIN-' + Date.now()),
    date: b.date || '',
    type: b.type === 'expense' ? 'expense' : 'income',
    category: b.category || '',
    amount: Number(b.amount) || 0,
    notes: b.notes || ''
  };

  s.finance.push(record);
  db.saveStore();

  res.status(201).json(record);
});

router.put('/:id', (req, res) => {
  const s = store();

  if (!s.finance) s.finance = [];

  const i = s.finance.findIndex(function (x) {
    return x.id === req.params.id;
  });

  if (i === -1) {
    return res.status(404).json({ error: 'Not found' });
  }

  const b = req.body || {};

  s.finance[i] = {
    ...s.finance[i],
    date: b.date || '',
    type: b.type === 'expense' ? 'expense' : 'income',
    category: b.category || '',
    amount: Number(b.amount) || 0,
    notes: b.notes || ''
  };

  db.saveStore();

  res.json(s.finance[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();

  const before = (s.finance || []).length;

  s.finance = (s.finance || []).filter(function (x) {
    return x.id !== req.params.id;
  });

  db.saveStore();

  if ((s.finance || []).length === before) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({ ok: true });
});

module.exports = router;

