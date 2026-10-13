/* ==========================================================================
   PLAY SCHOOL — Public landing page (S33)
   No framework, no backend: pure nav/menu/scroll-reveal behaviour for the
   marketing entry point. All "Sign In" actions link directly to the
   existing signin.html route and its real demo auth flow — nothing here
   performs authentication.
   ========================================================================== */
(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('landYear');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    wireMobileMenu();
    wireScrollReveal();
    wireSmoothAnchors();
  });

  function wireMobileMenu() {
    const toggle = document.getElementById('landMenuToggle');
    const menu = document.getElementById('landMobileMenu');
    if (!toggle || !menu) return;
    const close = () => { menu.classList.remove('is-open'); toggle.setAttribute('aria-expanded', 'false'); };
    const open = () => { menu.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true'); };
    toggle.addEventListener('click', () => { menu.classList.contains('is-open') ? close() : open(); });
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  function wireScrollReveal() {
    const targets = document.querySelectorAll('.land-reveal');
    if (!targets.length) return;
    if (!('IntersectionObserver' in window)) { targets.forEach((t) => t.classList.add('is-in')); return; }

    // Reveal anything already on screen immediately, rather than waiting on
    // the observer's first callback — some browsing contexts (a backgrounded
    // tab, aggressive power-saving throttling) can delay that callback, and
    // real content must never be left permanently invisible because of it.
    const revealIfVisible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('is-in');
    };
    targets.forEach(revealIfVisible);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-in'); io.unobserve(entry.target); }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    targets.forEach((t) => { if (!t.classList.contains('is-in')) io.observe(t); });

    // Belt-and-suspenders: force-reveal everything after a short delay so a
    // throttled/suspended observer can never strand content off-screen.
    window.setTimeout(() => targets.forEach((t) => t.classList.add('is-in')), 2000);
  }

  function wireSmoothAnchors() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.querySelectorAll('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        const target = id && document.getElementById(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
  }
})();
