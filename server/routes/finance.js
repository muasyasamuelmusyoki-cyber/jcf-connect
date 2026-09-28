const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

function ensure(s) {
  if (!Array.isArray(s.finance)) s.finance = [];
}

function normalize(t) {
  return {
    id: t.id || '',
    date: t.date || '',
    type: t.type === 'expense' ? 'expense' : 'income',
    category: t.category || '',
    amount: Number(t.amount) || 0,
    notes: t.notes || '',
    createdAt: t.createdAt || t.created_at || '',
    updatedAt: t.updatedAt || t.updated_at || ''
  };
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  const list = s.finance
    .map(normalize)
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  res.json(list);
});

router.get('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const row = s.finance.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Transaction not found' });
  res.json(normalize(row));
});

router.post('/', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  const amount = Number(b.amount) || 0;
  if (!b.date) return res.status(400).json({ error: 'Date is required' });
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

  const now = new Date().toISOString();
  const record = {
    id: b.id || ('FIN-' + Date.now()),
    date: b.date,
    type: b.type === 'expense' ? 'expense' : 'income',
    category: String(b.category || '').trim() || 'Other',
    amount,
    notes: String(b.notes || '').trim(),
    createdAt: now,
    updatedAt: now
  };

  s.finance.push(record);
  db.saveStore();
  res.status(201).json(normalize(record));
});

router.put('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const i = s.finance.findIndex((x) => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Transaction not found' });

  const b = req.body || {};
  const amount = Number(b.amount) || 0;
  if (!b.date) return res.status(400).json({ error: 'Date is required' });
  if (amount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

  const prev = s.finance[i];
  s.finance[i] = {
    ...prev,
    date: b.date,
    type: b.type === 'expense' ? 'expense' : 'income',
    category: String(b.category || '').trim() || prev.category,
    amount,
    notes: String(b.notes || '').trim(),
    updatedAt: new Date().toISOString()
  };

  db.saveStore();
  res.json(normalize(s.finance[i]));
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const before = s.finance.length;
  s.finance = s.finance.filter((x) => String(x.id) !== String(req.params.id));
  if (s.finance.length === before) {
    return res.status(404).json({ error: 'Transaction not found' });
  }
  db.saveStore();
  res.json({ ok: true });
});

module.exports = router;