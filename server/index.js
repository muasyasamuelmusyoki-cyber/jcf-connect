require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db');

const authRoutes = require('./routes/auth');
const membersRoutes = require('./routes/members');
const visitorsRoutes = require('./routes/visitors');
const groupsRoutes = require('./routes/groups');
const groupMembersRoutes = require('./routes/group-members');
const departmentsRoutes = require('./routes/departments');
const deptMembersRoutes = require('./routes/dept-members');
const attendanceRoutes = require('./routes/attendance');
const financeRoutes = require('./routes/finance');
const assetsRoutes = require('./routes/assets');
const eventsRoutes = require('./routes/events');
const champsClassesRoutes = require('./routes/champs-classes');
const champsStudentsRoutes = require('./routes/champs-students');
const usersRoutes = require('./routes/users');
const settingsRoutes = require('./routes/settings');
const twofactorRoutes = require('./routes/twofactor');
const leadersRoutes = require('./routes/leaders');
const reportsRoutes = require('./routes/reports');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', authRoutes);
app.use('/api/members', membersRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/group-members', groupMembersRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/dept-members', deptMembersRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/assets', assetsRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/champs-classes', champsClassesRoutes);
app.use('/api/champs-students', champsStudentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/2fa', twofactorRoutes);
app.use('/api/leaders', leadersRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/backup', backupRoutes);

app.use(express.static(path.join(__dirname, '..')));
app.use('/pages', express.static(path.join(__dirname, '..', 'pages')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'JCF Connect',
    time: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('JCF Connect API running on http://localhost:' + PORT);
  if (!process.env.JWT_SECRET) {
    console.warn('Warning: JWT_SECRET not set in .env (using default)');
  }
  if (!process.env.SMTP_USER) {
    console.warn('Warning: SMTP not fully configured');
  }
});
