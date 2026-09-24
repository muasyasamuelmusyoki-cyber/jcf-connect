var ROLE_DEFAULTS = {
  'Super Admin': ['*'],
  'Admin': [
    'dashboard', 'members', 'visitors', 'groups', 'departments',
    'attendance', 'champs', 'finance', 'assets', 'events', 'reports', 'settings'
  ],
  'Finance': ['dashboard', 'finance', 'reports'],
  'Usher': ['dashboard', 'visitors', 'attendance']
};

var PAGE_MODULE = {
  'dashboard.html': 'dashboard',
  'members.html': 'members',
  'member-form.html': 'members',
  'visitors.html': 'visitors',
  'visitor-form.html': 'visitors',
  'growth-groups.html': 'groups',
  'departments.html': 'departments',
  'attendance.html': 'attendance',
  'champs-house.html': 'champs',
  'champs-class-form.html': 'champs',
  'champs-student-form.html': 'champs',
  'finance.html': 'finance',
  'assets.html': 'assets',
  'asset-form.html': 'assets',
  'events.html': 'events',
  'event-form.html': 'events',
  'reports.html': 'reports',
  'settings.html': 'settings'
  'leaders.html': 'leaders',
};

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('jcf_user') || 'null');
  } catch (e) {
    return null;
  }
}

function getUserAccess() {
  var s = getSession();
  if (!s) return [];
  if (Array.isArray(s.access) && s.access.length) return s.access;
  return ROLE_DEFAULTS[s.role] || [];
}

function canAccess(moduleKey) {
  var access = getUserAccess();
  if (access.indexOf('*') !== -1) return true;
  return access.indexOf(moduleKey) !== -1;
}

function requireAccess(moduleKey) {
  if (!localStorage.getItem('jcf_token') || !getSession()) {
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

function applySidebarAccess() {
  var links = document.querySelectorAll('.sidebar-nav a, .sidebar-nav .nav-item');
  for (var i = 0; i < links.length; i++) {
    var href = (links[i].getAttribute('href') || '').split('?')[0];
    var file = href.split('/').pop();
    var key = PAGE_MODULE[file];
    if (key && !canAccess(key)) {
      links[i].style.display = 'none';
    }
  }
}

/** Auto-protect current page from filename */
function protectCurrentPage() {
  var file = (window.location.pathname.split('/').pop() || '').split('?')[0];
  var key = PAGE_MODULE[file];
  if (!key) {
    if (!localStorage.getItem('jcf_token') || !getSession()) {
      window.location.href = 'login.html';
      return false;
    }
    applySidebarAccess();
    return true;
  }
  if (!requireAccess(key)) return false;
  applySidebarAccess();
  return true;
}

// Run automatically when this script loads
protectCurrentPage();