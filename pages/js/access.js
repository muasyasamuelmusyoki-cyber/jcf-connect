/* JCF Connect – access control + global idle logout */
(function () {
  var IDLE_DEFAULT_MS = 5 * 60 * 1000;
  var idleTimer = null;
  var lastActive = Date.now();

  function getSession() {
    try { return JSON.parse(localStorage.getItem('jcf_user') || 'null'); }
    catch (e) { return null; }
  }
  function getToken() {
    return localStorage.getItem('jcf_token') || '';
  }
  function logout(reason) {
    localStorage.removeItem('jcf_token');
    localStorage.removeItem('jcf_user');
    if (reason) {
      try { sessionStorage.setItem('jcf_logout_reason', reason); } catch (e) {}
    }
    window.location.href = 'login.html';
  }

  function getIdleMs() {
    try {
      var prefs = JSON.parse(localStorage.getItem('jcf_prefs') || 'null');
      if (prefs && prefs.idle === false) return 0;
      var mins = (prefs && prefs.idleMins) ? parseInt(prefs.idleMins, 10) : 5;
      if (!mins || mins < 1) mins = 5;
      return mins * 60 * 1000;
    } catch (e) {
      return IDLE_DEFAULT_MS;
    }
  }

  function resetIdle() {
    lastActive = Date.now();
    var ms = getIdleMs();
    if (!ms) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      logout('idle');
    }, ms);
  }

  function startIdleWatch() {
    if (!getToken()) return;
    ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'].forEach(function (ev) {
      document.addEventListener(ev, resetIdle, { passive: true });
    });
    resetIdle();
  }

  /* Module keys used in Settings → user access */
  var PAGE_ACCESS = {
    'dashboard.html': 'dashboard',
    'members.html': 'members',
    'member-form.html': 'members',
    'visitors.html': 'visitors',
    'visitor-form.html': 'visitors',
    'growth-groups.html': 'groups',
    'departments.html': 'departments',
    'department-form.html': 'departments',
    'leaders.html': 'members',
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
  };

  function canAccess(key) {
    var s = getSession();
    if (!s) return false;
    if (s.role === 'Super Admin') return true;
    var access = s.access;
    if (!access || !access.length) {
      // role defaults
      if (s.role === 'Admin') return true;
      if (s.role === 'Finance') return key === 'finance' || key === 'dashboard' || key === 'reports';
      return key === 'dashboard';
    }
    if (access.indexOf('*') !== -1) return true;
    return access.indexOf(key) !== -1;
  }

  window.requireAccess = function (key) {
    if (!getToken() || !getSession()) {
      logout();
      return false;
    }
    if (!canAccess(key)) {
      alert('You do not have access to this section.');
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  };

  window.applySidebarAccess = function () {
    var items = document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-nav a');
    items.forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0].split('/').pop();
      var key = PAGE_ACCESS[href];
      if (key && !canAccess(key)) {
        a.style.display = 'none';
      }
    });
  };

  // Auto-run on every page that includes this script
  document.addEventListener('DOMContentLoaded', function () {
    var page = (location.pathname || '').split('/').pop() || '';
    if (page === 'login.html' || page === 'forgot-password.html' || page === '') {
      return;
    }
    if (!getToken() || !getSession()) {
      logout();
      return;
    }
    var key = PAGE_ACCESS[page];
    if (key && !canAccess(key)) {
      alert('You do not have access to this section.');
      window.location.href = 'dashboard.html';
      return;
    }
    try { applySidebarAccess(); } catch (e) {}
    startIdleWatch();
  });
})();