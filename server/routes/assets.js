const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

router.get('/', (req, res) => {
  res.json((store().assets || []).slice().reverse());
});

router.get('/:id', (req, res) => {
  const row = (store().assets || []).find((x) => x.id === req.params.id);
  if (!row) return res.status(404).json({ error: 'Asset not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const s = store();
  if (!s.assets) s.assets = [];
  const b = req.body || {};
  const asset = {
    id: b.id || ('AST-' + Date.now()),
    name: b.name || '',
    category: b.category || '',
    serial_number: b.serialNumber || b.serial_number || '',
    quantity: Number(b.quantity) || 1,
    condition: b.condition || 'Good',
    status: b.status || 'Available',
    location: b.location || '',
    purchase_date: b.purchaseDate || b.purchase_date || '',
    purchase_value: Number(b.purchaseValue || b.purchase_value) || 0,
    supplier: b.supplier || '',
    assigned_to: b.assignedTo || b.assigned_to || '',
    notes: b.notes || ''
  };
  s.assets.push(asset);
  db.saveStore();
  res.status(201).json(asset);
});

router.put('/:id', (req, res) => {
  const s = store();
  if (!s.assets) s.assets = [];
  const i = s.assets.findIndex((x) => x.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Asset not found' });
  const b = req.body || {};
  s.assets[i] = {
    ...s.assets[i],
    name: b.name || '',
    category: b.category || '',
    serial_number: b.serialNumber || b.serial_number || '',
    quantity: Number(b.quantity) || 1,
    condition: b.condition || 'Good',
    status: b.status || 'Available',
    location: b.location || '',
    purchase_date: b.purchaseDate || b.purchase_date || '',
    purchase_value: Number(b.purchaseValue || b.purchase_value) || 0,
    supplier: b.supplier || '',
    assigned_to: b.assignedTo || b.assigned_to || '',
    notes: b.notes || ''
  };
  db.saveStore();
  res.json(s.assets[i]);
});

router.delete('/:id', (req, res) => {
  const s = store();
  const before = (s.assets || []).length;
  s.assets = (s.assets || []).filter((x) => x.id !== req.params.id);
  db.saveStore();
  if ((s.assets || []).length === before) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ ok: true });
});

module.exports = router;