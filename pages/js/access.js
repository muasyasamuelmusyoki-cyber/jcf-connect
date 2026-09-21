/* JCF Connect – role access helpers */

var ROLE_ACCESS = {
  'Super Admin': ['*'],
  'Admin': [
    'dashboard', 'members', 'visitors', 'groups', 'departments',
    'attendance', 'champs', 'finance', 'assets', 'events', 'reports', 'settings'
  ],
  'Finance': [
    'dashboard', 'finance', 'reports'
  ],
  'Usher': [
    'dashboard', 'visitors', 'attendance'
  ],
  'Member': [
    'dashboard'
  ]
};

var NAV_ACCESS = {
  'dashboard.html': 'dashboard',
  'members.html': 'members',
  'member-form.html': 'members',
  'visitors.html': 'visitors',
  'visitor-form.html': 'visitors',
  'growth-groups.html': 'groups',
  'departments.html': 'departments',
  'attendance.html': 'attendance',
  'champs-house.html': 'champs',
  'finance.html': 'finance',
  'assets.html': 'assets',
  'asset-form.html': 'assets',
  'events.html': 'events',
  'event-form.html': 'events',
  'reports.html': 'reports',
  'settings.html': 'settings'
};

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('jcf_user') || 'null');
  } catch (e) {
    return null;
  }
}

function getToken() {
  return localStorage.getItem('jcf_token') || '';
}

function canAccess(moduleKey) {
  var session = getSession();
  if (!session || !session.role) return false;
  var list = ROLE_ACCESS[session.role];
  if (!list) return false;
  if (list.indexOf('*') !== -1) return true;
  return list.indexOf(moduleKey) !== -1;
}

/** Call at top of protected pages */
function requireAccess(moduleKey) {
  if (!getToken() || !getSession()) {
    window.location.href = 'login.html';
    return false;
  }
  if (!canAccess(moduleKey)) {
    alert('You do not have permission to open this page.');
    window.location.href = 'dashboard.html';
    return false;
  }
  return true;
}

/** Hide sidebar links the user cannot open */
function applySidebarAccess() {
  var links = document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-nav a');
  for (var i = 0; i < links.length; i++) {
    var href = links[i].getAttribute('href') || '';
    var file = href.split('/').pop().split('?')[0];
    var key = NAV_ACCESS[file];
    if (key && !canAccess(key)) {
      links[i].style.display = 'none';
    }
  }
}