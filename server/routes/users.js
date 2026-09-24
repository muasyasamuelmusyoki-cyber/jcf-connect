const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authRequired, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(authRequired);

function publicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    status: u.status || 'Active',
    access: Array.isArray(u.access)
      ? u.access
      : (u.role === 'Super Admin' ? ['*'] : [])
  };
}

function logAction(store, actor, action, detail) {
  if (!store.logs) store.logs = [];

  store.logs.unshift({
    id: 'LOG-' + Date.now(),
    at: new Date().toISOString(),
    actor: actor || 'system',
    action: action,
    detail: detail || ''
  });

  if (store.logs.length > 500) {
    store.logs = store.logs.slice(0, 500);
  }
}

router.get('/', requireRole('Super Admin', 'Admin'), (req, res) => {
  const store = db.getStore();

  res.json((store.users || []).map(publicUser));
});

router.post('/', requireRole('Super Admin', 'Admin'), (req, res) => {
  const store = db.getStore();

  if (!store.users) {
    store.users = [];
  }

  const b = req.body || {};
  const email = (b.email || '').trim().toLowerCase();

  if (!email || !b.name || !b.password) {
    return res.status(400).json({
      error: 'Name, email and password are required'
    });
  }

  if (
    store.users.find(
      (u) => (u.email || '').toLowerCase() === email
    )
  ) {
    return res.status(400).json({
      error: 'Email already exists'
    });
  }

  const isSuperAdmin = req.user.role === 'Super Admin';

  if (!isSuperAdmin && b.role === 'Super Admin') {
    return res.status(403).json({
      error: 'Only a Super Admin can assign Super Admin privileges'
    });
  }

  const user = {
    id: Date.now(),
    email,
    name: String(b.name).trim(),
    role: isSuperAdmin && b.role ? b.role : 'Admin',
    status: 'Active',
    password: bcrypt.hashSync(b.password, 10),
    access: isSuperAdmin && Array.isArray(b.access)
      ? b.access
      : []
  };

  store.users.push(user);

  logAction(
    store,
    req.user.email,
    'user.create',
    email
  );

  db.saveStore();

  res.status(201).json(publicUser(user));
});

router.put('/:id', requireRole('Super Admin', 'Admin'), (req, res) => {
  const store = db.getStore();

  const id = isNaN(Number(req.params.id))
    ? req.params.id
    : Number(req.params.id);

  const i = (store.users || []).findIndex(
    (u) => u.id === id
  );

  if (i === -1) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  const b = req.body || {};
  const u = store.users[i];

  const isSuperAdmin = req.user.role === 'Super Admin';
  const isSelf = String(req.user.id) === String(id);
  const targetIsSuperAdmin = u.role === 'Super Admin';

  if (!isSuperAdmin && targetIsSuperAdmin) {
    return res.status(403).json({
      error: 'Only a Super Admin can modify a Super Admin account'
    });
  }

  if (
    !isSuperAdmin &&
    (b.role !== undefined || b.access !== undefined)
  ) {
    return res.status(403).json({
      error: 'Only a Super Admin can change roles or access permissions'
    });
  }

  if (
    isSelf &&
    b.role !== undefined &&
    String(b.role) !== String(u.role)
  ) {
    return res.status(400).json({
      error: 'You cannot change your own role'
    });
  }

  if (
    isSelf &&
    b.status &&
    b.status !== 'Active'
  ) {
    return res.status(400).json({
      error: 'You cannot suspend your own account'
    });
  }

  if (b.name) {
    u.name = String(b.name).trim();
  }

  if (isSuperAdmin && b.role) {
    u.role = b.role;
  }

  if (b.status) {
    u.status = b.status;
  }

  if (isSuperAdmin && Array.isArray(b.access)) {
    u.access = b.access;
  }

  if (b.password && String(b.password).length >= 6) {
    u.password = bcrypt.hashSync(b.password, 10);
  }

  logAction(
    store,
    req.user.email,
    'user.update',
    u.email
  );

  db.saveStore();

  res.json(publicUser(u));
});

router.delete('/:id', requireRole('Super Admin'), (req, res) => {
  const store = db.getStore();

  const id = isNaN(Number(req.params.id))
    ? req.params.id
    : Number(req.params.id);

  const user = (store.users || []).find(
    (u) => u.id === id
  );

  if (!user) {
    return res.status(404).json({
      error: 'User not found'
    });
  }

  if (String(req.user.id) === String(id)) {
    return res.status(400).json({
      error: 'You cannot delete your own account'
    });
  }

  store.users = store.users.filter(
    (u) => u.id !== id
  );

  logAction(
    store,
    req.user.email,
    'user.delete',
    user.email
  );

  db.saveStore();

  res.json({ ok: true });
});

router.get('/logs', requireRole('Super Admin', 'Admin'), (req, res) => {
  const store = db.getStore();

  res.json((store.logs || []).slice(0, 100));
});

module.exports = router;