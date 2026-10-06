/**
 * JCF Connect – Role-based access control (client)
 * Paste at the bottom of every protected page:
 *   <script src="js/access.js"></script>
 *   Then call: requireAccess('members'); applySidebarAccess();
 */

(function () {
  'use strict';

  var PAGE_KEYS = {
    'dashboard.html': 'dashboard',
    'members.html': 'members',
    'member-form.html': 'members',
    'visitors.html': 'visitors',
    'visitor-form.html': 'visitors',
    'growth-groups.html': 'groups',
    'departments.html': 'departments',
    'department-form.html': 'departments',
    'leaders.html': 'leaders',
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

  var NAV_TO_KEY = {
    'dashboard.html': 'dashboard',
    'members.html': 'members',
    'visitors.html': 'visitors',
    'growth-groups.html': 'groups',
    'departments.html': 'departments',
    'leaders.html': 'leaders',
    'attendance.html': 'attendance',
    'champs-house.html': 'champs',
    'finance.html': 'finance',
    'assets.html': 'assets',
    'events.html': 'events',
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

  function logout(reason) {
    localStorage.removeItem('jcf_token');
    localStorage.removeItem('jcf_user');
    if (reason) {
      try { sessionStorage.setItem('jcf_logout_reason', reason); } catch (e) {}
    }
    window.location.href = 'login.html';
  }

  /** Super Admin always has full access */
  function isSuperAdmin(user) {
    return user && (user.role === 'Super Admin' || user.role === 'super admin');
  }

  /**
   * Returns true if user may access the given page key
   * Keys: dashboard, members, visitors, groups, departments, leaders,
   *        attendance, champs, finance, assets, events, reports, settings
   */
  function canAccess(pageKey) {
    var user = getSession();
    if (!user || !getToken()) return false;
    if (isSuperAdmin(user)) return true;

    var access = user.access;
    if (!Array.isArray(access)) access = [];
    if (access.indexOf('*') !== -1) return true;
    if (!pageKey) return true;
    return access.indexOf(pageKey) !== -1;
  }

  /**
   * Block page if no permission. Redirects to dashboard (or login).
   * Call near the top of your page script, after requireLogin.
   *
   * Example: requireAccess('finance');
   */
  function requireAccess(pageKey) {
    if (!getToken() || !getSession()) {
      logout();
      return false;
    }
    if (!canAccess(pageKey)) {
      alert('You do not have permission to open this page.');
      window.location.href = 'dashboard.html';
      return false;
    }
    return true;
  }

  /**
   * Auto-detect current page key from URL and enforce access
   */
  function requireAccessForCurrentPage() {
    var file = (window.location.pathname.split('/').pop() || '').toLowerCase();
    var key = PAGE_KEYS[file];
    if (!key) return true;
    return requireAccess(key);
  }

  /**
   * Hide sidebar links the user cannot access
   */
  function applySidebarAccess() {
    var links = document.querySelectorAll('.sidebar-nav a.nav-item, .sidebar-nav a');
    links.forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('?')[0].split('/').pop();
      var key = NAV_TO_KEY[href];
      if (!key) return;
      if (!canAccess(key)) {
        a.style.display = 'none';
      }
    });
  }

  /**
   * Idle auto-logout (default 5 minutes)
   * Works across all pages that include this script
   */
  var idleTimer = null;
  var idleMs = 5 * 60 * 1000;

  function getIdleMs() {
    try {
      var prefs = JSON.parse(localStorage.getItem('jcf_prefs') || 'null');
      if (prefs && prefs.idle === false) return 0;
      var mins = prefs && prefs.idleMins ? Number(prefs.idleMins) : 5;
      return Math.max(1, mins) * 60 * 1000;
    } catch (e) {
      return 5 * 60 * 1000;
    }
  }

  function resetIdleTimer() {
    idleMs = getIdleMs();
    if (!idleMs) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      logout('idle');
    }, idleMs);
  }

  function startIdleWatch() {
    if (!getToken()) return;
    ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'].forEach(function (ev) {
      document.addEventListener(ev, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();
  }

  // Export for pages
  window.getSession = window.getSession || getSession;
  window.getToken = window.getToken || getToken;
  window.logout = window.logout || logout;
  window.canAccess = canAccess;
  window.requireAccess = requireAccess;
  window.requireAccessForCurrentPage = requireAccessForCurrentPage;
  window.applySidebarAccess = applySidebarAccess;
  window.resetIdleTimer = resetIdleTimer;
  window.startIdleWatch = startIdleWatch;

  // Auto-run on load
  document.addEventListener('DOMContentLoaded', function () {
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('login') !== -1 || path.indexOf('forgot') !== -1) return;

    if (!getToken() || !getSession()) {
      logout();
      return;
    }

    requireAccessForCurrentPage();
    applySidebarAccess();
    startIdleWatch();
  });
})();