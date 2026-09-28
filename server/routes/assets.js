const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function store() {
  return db.getStore();
}

function ensure(s) {
  if (!Array.isArray(s.assets)) s.assets = [];
}

function normalize(a) {
  return {
    id: a.id,
    name: a.name || '',
    category: a.category || 'Other',
    serialNumber: a.serialNumber || a.serial_number || '',
    quantity: Number(a.quantity) || 0,
    condition: a.condition || '',
    status: a.status || 'Available',
    location: a.location || '',
    purchaseValue:
      Number(a.purchaseValue != null ? a.purchaseValue : a.purchase_value) || 0,
    assignedTo: a.assignedTo || a.assigned_to || '',
    notes: a.notes || '',
    createdAt: a.createdAt || a.created_at || null
  };
}

router.get('/', (req, res) => {
  const s = store();
  ensure(s);
  res.json(s.assets.map(normalize).reverse());
});

router.get('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const row = s.assets.find((x) => String(x.id) === String(req.params.id));
  if (!row) return res.status(404).json({ error: 'Asset not found' });
  res.json(normalize(row));
});

router.post('/', (req, res) => {
  const s = store();
  ensure(s);
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Name is required' });

  const asset = {
    id: b.id || 'AST-' + Date.now(),
    name: String(b.name).trim(),
    category: b.category || 'Other',
    serialNumber: (b.serialNumber || b.serial_number || '').trim(),
    quantity: Number(b.quantity) || 1,
    condition: b.condition || 'Good',
    status: b.status || 'Available',
    location: (b.location || '').trim(),
    purchaseValue:
      Number(b.purchaseValue != null ? b.purchaseValue : b.purchase_value) || 0,
    assignedTo: (b.assignedTo || b.assigned_to || '').trim(),
    notes: (b.notes || '').trim(),
    createdAt: new Date().toISOString()
  };

  s.assets.push(asset);
  db.saveStore();
  res.status(201).json(normalize(asset));
});

router.put('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const i = s.assets.findIndex((x) => String(x.id) === String(req.params.id));
  if (i === -1) return res.status(404).json({ error: 'Asset not found' });

  const b = req.body || {};
  const cur = s.assets[i];

  s.assets[i] = {
    ...cur,
    name: b.name != null ? String(b.name).trim() : cur.name,
    category: b.category || cur.category,
    serialNumber: (b.serialNumber || b.serial_number || cur.serialNumber || '').trim(),
    quantity: b.quantity != null ? Number(b.quantity) : cur.quantity,
    condition: b.condition || cur.condition,
    status: b.status || cur.status,
    location: b.location != null ? String(b.location).trim() : cur.location,
    purchaseValue:
      b.purchaseValue != null || b.purchase_value != null
        ? Number(b.purchaseValue != null ? b.purchaseValue : b.purchase_value)
        : cur.purchaseValue,
    assignedTo: (b.assignedTo || b.assigned_to || cur.assignedTo || '').trim(),
    notes: b.notes != null ? String(b.notes).trim() : cur.notes,
    updatedAt: new Date().toISOString()
  };

  db.saveStore();
  res.json(normalize(s.assets[i]));
});

router.delete('/:id', (req, res) => {
  const s = store();
  ensure(s);
  const before = s.assets.length;
  s.assets = s.assets.filter((x) => String(x.id) !== String(req.params.id));
  db.saveStore();
  if (s.assets.length === before) {
    return res.status(404).json({ error: 'Asset not found' });
  }
  res.json({ ok: true });
});

module.exports = router;