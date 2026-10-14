const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET;

const MODULE_KEYS = [
  'dashboard', 'members', 'visitors', 'groups', 'departments', 'leaders',
  'attendance', 'champs', 'finance', 'assets', 'events', 'reports',
  'settings', 'licenses'
];

function normalizeAccess(access, role) {
  if (role === 'Super Admin') return ['*'];
  if (!Array.isArray(access)) return [];
  return Array.from(new Set(access.filter((key) =>
    typeof key === 'string' && MODULE_KEYS.includes(key)
  )));
}

if (
  typeof JWT_SECRET !== 'string' ||
  Buffer.byteLength(JWT_SECRET, 'utf8') < 32
) {
  throw new Error(
    'Security error: JWT_SECRET must be configured with at least 32 bytes.'
  );
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.findUserById(payload.id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if ((user.status || 'Active') !== 'Active') {
      return res.status(403).json({ error: 'Account is suspended' });
    }
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      access: normalizeAccess(user.access, user.role)
    };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'Super Admin') return next();
    if (roles.length && !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    next();
  };
}

function requireAccess(...pageKeys) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (req.user.role === 'Super Admin') return next();

    const access = normalizeAccess(req.user.access, req.user.role);

    const allowed = pageKeys.some((k) => access.includes(k));
    if (!allowed) {
      return res.status(403).json({
        error: 'You do not have permission for this module',
        required: pageKeys
      });
    }
    next();
  };
}


module.exports = {
  authRequired,
  requireRole,
  requireAccess,
  normalizeAccess,
  MODULE_KEYS,
  JWT_SECRET
};