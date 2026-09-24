function openSidebar() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('sidebarOverlay');
  if (s) s.classList.add('open');
  if (o) o.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  var s = document.getElementById('sidebar');
  var o = document.getElementById('sidebarOverlay');
  if (s) s.classList.remove('open');
  if (o) o.classList.remove('show');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function () {
  document.querySelectorAll('.nav-item').forEach(function (link) {
    link.addEventListener('click', function () {
      if (window.innerWidth <= 900) closeSidebar();
    });
  });
});