/* AmzLoss navigation — burger menu + mobile dropdown toggles.
   Works on all pages; the burger is optional (404 page has no burger). */

document.addEventListener('DOMContentLoaded', function () {
  var burger = document.querySelector('.burger');
  var nav = document.querySelector('.nav-links');
  var navCta = document.querySelector('.nav-cta');
  var mediaQuery = window.matchMedia('(max-width: 1100px)');

  function openMenu() {
    nav.classList.add('open');
    burger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    if (mediaQuery.matches && navCta && !nav.querySelector('.mobile-cta')) {
      var clone = navCta.cloneNode(true);
      clone.classList.add('mobile-cta');
      clone.style.cssText = 'display:flex;flex-direction:column;width:100%;margin-top:8px;padding:0 4px;';
      clone.querySelectorAll('a').forEach(function (a) {
        a.style.cssText = 'width:100%;text-align:center;padding:14px 16px;font-size:1.02rem;';
      });
      nav.appendChild(clone);
    }
  }
  function closeMenu() {
    nav.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }
  function toggleMenu() {
    nav.classList.contains('open') ? closeMenu() : openMenu();
  }

  if (burger && nav) {
    burger.addEventListener('click', toggleMenu);
    nav.querySelectorAll('.nav-toggle').forEach(function (t) {
      t.addEventListener('click', function (e) {
        if (!mediaQuery.matches) return;
        var item = t.parentElement;
        var wasOpen = item.classList.contains('open');
        nav.querySelectorAll('.nav-item.open').forEach(function (o) { o.classList.remove('open'); });
        if (!wasOpen) item.classList.add('open');
      });
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { if (mediaQuery.matches) closeMenu(); });
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });
    mediaQuery.addEventListener('change', function (e) { if (!e.matches) closeMenu(); });
  }

  // Desktop dropdowns: close when clicking outside
  document.addEventListener('click', function (e) {
    if (!e.target.closest('.nav-item')) {
      nav.querySelectorAll('.nav-item.open').forEach(function (o) { o.classList.remove('open'); });
    }
  });

  // Theme toggle (dark/light) — persisted, applied early to avoid flash
  var themeBtn = document.getElementById('theme-toggle');
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('amzloss_theme', theme);
    if (themeBtn) themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }
  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
  }
  if (themeBtn) themeBtn.addEventListener('click', toggleTheme);
  var savedTheme = localStorage.getItem('amzloss_theme') || 'light';
  applyTheme(savedTheme);

  // Inject the "Follow us" column into every page footer (one source of truth).
  var SOCIAL = {
    facebook: 'https://web.facebook.com/profile.php?id=61593299064372',
    x: '',
    tumblr: '',
    instagram: ''
  };
  var SOCIAL_LABELS = {
    facebook: 'Facebook',
    x: 'X',
    tumblr: 'Tumblr',
    instagram: 'Instagram'
  };
  function injectFollowColumn() {
    var grid = document.querySelector('.site-footer .footer-grid');
    if (!grid || grid.querySelector('#follow-col')) return;
    var col = document.createElement('div');
    col.className = 'footer-col';
    col.id = 'follow-col';
    var h = document.createElement('h4');
    h.textContent = 'Follow us';
    col.appendChild(h);
    Object.keys(SOCIAL).forEach(function (key) {
      var url = SOCIAL[key];
      if (!url) return;
      var a = document.createElement('a');
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = SOCIAL_LABELS[key];
      col.appendChild(a);
    });
    grid.appendChild(col);
  }
  injectFollowColumn();
});