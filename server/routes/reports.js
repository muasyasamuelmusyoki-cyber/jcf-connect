const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/summary', (req, res) => {
  const s = db.getStore();
  const members = s.members || [];
  const visitors = s.visitors || [];
  const groups = s.growth_groups || s.groups || [];
  const depts = s.departments || [];
  const leaders = s.leaders || [];
  const events = s.events || [];
  const assets = s.assets || [];
  const attendance = s.attendance || [];
  const finance = s.finance || [];

  const today = new Date().toISOString().split('T')[0];
  const thisMonth = today.slice(0, 7);

  const income = finance
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const expense = finance
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const tithe = finance
    .filter((t) => t.type === 'income' && (t.category === 'Tithe' || t.category === 'tithe'))
    .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  const latestAtt = attendance.slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''))[0];

  res.json({
    members: {
      total: members.length,
      active: members.filter((m) => m.status === 'Active').length
    },
    visitors: {
      total: visitors.length,
      new: visitors.filter((v) => v.status === 'New').length
    },
    groups: groups.length,
    departments: depts.length,
    leaders: {
      total: leaders.length,
      active: leaders.filter((l) => l.status === 'Active').length
    },
    events: {
      upcoming: events.filter((e) => e.status === 'Planned' && (e.date || '') >= today).length,
      completed: events.filter((e) => e.status === 'Completed').length,
      thisMonth: events.filter((e) => e.date && e.date.startsWith(thisMonth)).length,
      cancelled: events.filter((e) => e.status === 'Cancelled').length
    },
    assets: {
      total: assets.length,
      available: assets.filter((a) => a.status === 'Available').length
    },
    finance: {
      income,
      expense,
      balance: income - expense,
      tithe
    },
    attendance: {
      latestTotal: latestAtt ? (latestAtt.total || 0) : 0,
      latestDate: latestAtt ? latestAtt.date : null,
      records: attendance.length
    }
  });
});

module.exports = router;