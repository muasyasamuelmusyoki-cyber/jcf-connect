const jwt = require('jsonwebtoken');
const db = require('../db');

const JWT_SECRET = process.env.JWT_SECRET || 'jcf-connect-secret-change-in-production';

if (!process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET not set in .env (using default)');
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
      access: Array.isArray(user.access)
        ? user.access
        : user.role === 'Super Admin'
          ? ['*']
          : []
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

    const access = Array.isArray(req.user.access) ? req.user.access : [];
    if (access.includes('*')) return next();

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
  JWT_SECRET
};