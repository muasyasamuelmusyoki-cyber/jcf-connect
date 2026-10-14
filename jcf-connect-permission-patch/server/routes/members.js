const express = require('express');
const db = require('../db');
const { authRequired, requireAccess } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired, requireAccess('members'));

router.get('/', (req, res) => {
  res.json(db.getMembers());
});

router.get('/:id', (req, res) => {
  const row = db.getMember(req.params.id);
  if (!row) return res.status(404).json({ error: 'Member not found' });
  res.json(row);
});

router.post('/', async (req, res) => {
  const b = req.body;
  const member = {
    id: b.id || ('MEM-' + Date.now()),
    name: b.name || '',
    phone: b.phone || '',
    email: b.email || '',
    gender: b.gender || '',
    address: b.address || '',
    occupation: b.occupation || '',
    dob: b.dob || '',
    marital_status: b.maritalStatus || b.marital_status || '',
    spouse: b.spouse || '',
    children: b.children || '',
    date_joined: b.dateJoined || b.date_joined || '',
    growth_group: b.group || b.growth_group || '',
    department: b.department || '',
    ministry: b.ministry || '',
    born_again: b.bornAgain || b.born_again || '',
    baptism: b.baptism || '',
    holy_spirit: b.holySpirit || b.holy_spirit || '',
    membership_class: b.membershipClass || b.membership_class || '',
    status: b.status || 'Active',
    created_at: new Date().toISOString()
  };
  db.addMember(member);
  await db.saveStore();
  res.status(201).json(member);
});

router.put('/:id', async (req, res) => {
  const b = req.body;
  const updated = db.updateMember(req.params.id, {
    name: b.name || '',
    phone: b.phone || '',
    email: b.email || '',
    gender: b.gender || '',
    address: b.address || '',
    occupation: b.occupation || '',
    dob: b.dob || '',
    marital_status: b.maritalStatus || b.marital_status || '',
    spouse: b.spouse || '',
    children: b.children || '',
    date_joined: b.dateJoined || b.date_joined || '',
    growth_group: b.group || b.growth_group || '',
    department: b.department || '',
    ministry: b.ministry || '',
    born_again: b.bornAgain || b.born_again || '',
    baptism: b.baptism || '',
    holy_spirit: b.holySpirit || b.holy_spirit || '',
    membership_class: b.membershipClass || b.membership_class || '',
    status: b.status || 'Active'
  });
  if (!updated) return res.status(404).json({ error: 'Member not found' });
  await db.saveStore();
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const ok = db.deleteMember(req.params.id);
  if (!ok) return res.status(404).json({ error: 'Member not found' });
  await db.saveStore();
  res.json({ ok: true });
});

module.exports = router;