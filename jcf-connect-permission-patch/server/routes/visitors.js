const express = require('express');
const db = require('../db');
const { authRequired, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireAccess('visitors'));

function load() {
  return db.getStore();
}

router.get('/', async (req, res) => {
  const store = load();
  const list = (store.visitors || []).slice().reverse();
  res.json(list);
});

router.get('/:id', async (req, res) => {
  const store = load();
  const row = (store.visitors || []).find((v) => v.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Visitor not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const b = req.body;
  const store = load();
  if (!store.visitors) store.visitors = [];

  const visitor = {
    id: b.id || ('VIS-' + Date.now()),
    name: b.name || '',
    phone: b.phone || '',
    email: b.email || '',
    visit_date: b.visitDate || b.visit_date || '',
    invited_by: b.invitedBy || b.invited_by || '',
    status: b.status || 'New',
    notes: b.notes || '',
    created_at: new Date().toISOString()
  };

  store.visitors.push(visitor);
  await db.saveStore();
  res.status(201).json(visitor);
});

router.put('/:id', async (req, res) => {
  const store = load();
  if (!store.visitors) store.visitors = [];
  const i = store.visitors.findIndex((v) => v.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Visitor not found' });

  const b = req.body;
  store.visitors[i] = {
    ...store.visitors[i],
    name: b.name || '',
    phone: b.phone || '',
    email: b.email || '',
    visit_date: b.visitDate || b.visit_date || store.visitors[i].visit_date,
    invited_by: b.invitedBy || b.invited_by || '',
    status: b.status || 'New',
    notes: b.notes || ''
  };
  await db.saveStore();
  res.json(store.visitors[i]);
});

router.delete('/:id', async (req, res) => {
  const store = load();
  const before = (store.visitors || []).length;
  store.visitors = (store.visitors || []).filter((v) => v.id !== req.params.id);
  await db.saveStore();
  if (store.visitors.length === before) {
    return res.status(404).json({ error: 'Visitor not found' });
  }
  res.json({ ok: true });
});

module.exports = router;