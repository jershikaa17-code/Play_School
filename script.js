/* ==========================================================================
   T00 DESIGN SYSTEM — interaction layer
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  let lastFocused = null;
  const trapFocus = (container, e) => {
    const focusables = $$('a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])', container)
      .filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  /* ---------- sticky nav active-section + smooth scroll ---------- */
  const navLinks = $$('.primary-nav__link, .nav-drawer__link');
  const sections = navLinks
    .map((l) => document.getElementById((l.getAttribute('href') || '').replace('#', '')))
    .filter(Boolean);

  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      const id = link.getAttribute('href');
      if (!id || id.charAt(0) !== '#') return;
      const target = $(id);
      if (!target) return;
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      closeNavDrawer();
      history.pushState(null, '', id);
    });
  });

  if ('IntersectionObserver' in window && sections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const id = '#' + entry.target.id;
          navLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === id));
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
  }

  /* ---------- hero pill quick-nav ---------- */
  $$('.hero__pill[data-target]').forEach((pill) => {
    pill.addEventListener('click', () => {
      const target = $(pill.dataset.target);
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });

  /* ---------- hero background: subtle mouse parallax ---------- */
  const heroSection = $('.hero');
  const heroParallaxLayers = $$('.hero-bg__parallax');
  if (heroSection && heroParallaxLayers.length && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && window.matchMedia('(pointer: fine)').matches) {
    let raf = null;
    function applyParallax(px, py) {
      heroParallaxLayers.forEach((layer) => {
        const depth = Number(layer.dataset.depth) || 0;
        layer.style.transform = `translate(${(px * depth).toFixed(2)}px, ${(py * depth).toFixed(2)}px)`;
      });
      raf = null;
    }
    heroSection.addEventListener('pointermove', (e) => {
      const rect = heroSection.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      if (!raf) raf = requestAnimationFrame(() => applyParallax(px, py));
    });
    heroSection.addEventListener('pointerleave', () => {
      if (!raf) raf = requestAnimationFrame(() => applyParallax(0, 0));
    });
  }

  /* ---------- mobile nav drawer ---------- */
  const navToggle = $('.nav-toggle');
  const navDrawer = $('#navDrawer');
  const navDrawerBackdrop = $('#navDrawerBackdrop');

  function openNavDrawer() {
    if (!navDrawer) return;
    lastFocused = document.activeElement;
    navDrawer.classList.add('is-open');
    navDrawerBackdrop.classList.add('is-open');
    navToggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    const first = $('a, button', navDrawer);
    if (first) first.focus();
  }
  function closeNavDrawer() {
    if (!navDrawer || !navDrawer.classList.contains('is-open')) return;
    navDrawer.classList.remove('is-open');
    navDrawerBackdrop.classList.remove('is-open');
    navToggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      navDrawer.classList.contains('is-open') ? closeNavDrawer() : openNavDrawer();
    });
    navDrawerBackdrop.addEventListener('click', closeNavDrawer);
    navDrawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeNavDrawer();
      if (e.key === 'Tab') trapFocus(navDrawer, e);
    });
  }

  /* ---------- generic tabs ---------- */
  $$('.tabs').forEach((tabGroup) => {
    const list = $('.tabs__list', tabGroup);
    const tabs = $$('.tabs__tab', tabGroup);
    const indicator = $('.tabs__indicator', tabGroup);
    const panels = $$('.tabs__panel', tabGroup);

    function moveIndicator(tab) {
      if (!indicator || !tab) return;
      indicator.style.width = tab.offsetWidth + 'px';
      indicator.style.transform = `translateX(${tab.offsetLeft - 4}px)`;
    }
    function activate(tab, { focus = false } = {}) {
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t === tab)));
      panels.forEach((p) => p.toggleAttribute('data-active', p.id === tab.getAttribute('aria-controls')));
      moveIndicator(tab);
      if (focus) tab.focus();
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => { if (!tab.disabled) activate(tab); });
      tab.addEventListener('keydown', (e) => {
        if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        let idx = i;
        if (e.key === 'ArrowRight') idx = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft') idx = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') idx = 0;
        if (e.key === 'End') idx = tabs.length - 1;
        activate(tabs[idx], { focus: true });
      });
    });
    const initial = tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
    requestAnimationFrame(() => moveIndicator(initial));
    window.addEventListener('resize', () => moveIndicator($('.tabs__tab[aria-selected="true"]', tabGroup)));
  });

  /* ---------- filters ---------- */
  const filterBar = $('#filterBar');
  if (filterBar) {
    const chipList = $('#filterChips', filterBar);
    const dropdown = $('.filter-dropdown', filterBar);
    const dropdownTrigger = $('.filter-dropdown > .btn', filterBar);
    const clearBtn = $('#filterClear', filterBar);

    function addChip(label, value) {
      if ($(`[data-chip="${value}"]`, chipList)) return;
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.dataset.chip = value;
      chip.innerHTML = `${label} <span class="chip__remove" role="button" tabindex="0" aria-label="Remove ${label} filter">&times;</span>`;
      chipList.appendChild(chip);
      chip.querySelector('.chip__remove').addEventListener('click', () => chip.remove());
      chip.querySelector('.chip__remove').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); chip.remove(); }
      });
    }

    if (dropdownTrigger) {
      dropdownTrigger.addEventListener('click', () => dropdown.classList.toggle('is-open'));
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target)) dropdown.classList.remove('is-open');
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') dropdown.classList.remove('is-open');
      });
    }
    $$('.filter-dropdown__option', filterBar).forEach((opt) => {
      opt.addEventListener('click', () => {
        addChip(opt.dataset.label, opt.dataset.value);
        dropdown.classList.remove('is-open');
      });
    });
    if (clearBtn) clearBtn.addEventListener('click', () => { chipList.innerHTML = ''; });
  }

  /* ---------- copy to clipboard (swatches + var chips) ---------- */
  function copyText(text, feedbackEl) {
    const done = () => {
      if (!feedbackEl) return;
      const parent = feedbackEl.closest('.swatch') || feedbackEl;
      parent.classList.add('is-copied');
      setTimeout(() => parent.classList.remove('is-copied'), 1400);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(done);
    } else {
      done();
    }
  }
  $$('.swatch[data-copy]').forEach((swatch) => {
    const copy = () => copyText(swatch.dataset.copy, swatch);
    swatch.addEventListener('click', copy);
    swatch.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copy(); } });
  });

  /* ---------- modal system ---------- */
  const modalBackdrop = $('#modalBackdrop');
  const modal = $('#modal', modalBackdrop);
  const modalContents = {
    info: {
      icon: 'modal__icon--info',
      title: 'Publish this draft?',
      text: 'Teammates in this workspace will immediately see the published version. You can unpublish at any time.',
      actions: '<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--primary" data-close>Publish</button>',
    },
    confirm: {
      icon: 'modal__icon--info',
      title: 'Leave without saving?',
      text: 'Your changes to this screen have not been saved. If you leave now, they will be discarded.',
      actions: '<button class="btn btn--ghost" data-close>Keep editing</button><button class="btn btn--primary" data-close>Discard changes</button>',
    },
    destructive: {
      icon: 'modal__icon--danger',
      title: 'Delete this classroom?',
      text: '“Sunflower Room — Toddlers” and all of its enrolment records will be permanently removed. This cannot be undone.',
      actions: '<button class="btn btn--ghost" data-close>Cancel</button><button class="btn btn--destructive" data-close>Delete classroom</button>',
    },
    success: {
      icon: 'modal__icon--success',
      title: 'Enrolment confirmed',
      text: 'Amara Osei has been added to the Sunflower Room roster for this term.',
      actions: '<button class="btn btn--primary" data-close>Done</button>',
    },
    error: {
      icon: 'modal__icon--error',
      title: 'We couldn’t save your changes',
      text: 'There was a problem reaching the server. Check your connection and try again.',
      actions: '<button class="btn btn--ghost" data-close>Dismiss</button><button class="btn btn--primary" data-close>Retry</button>',
    },
  };

  function openModal(type) {
    const data = modalContents[type] || modalContents.info;
    lastFocused = document.activeElement;
    modal.innerHTML = `
      <button class="modal__close" data-close aria-label="Close dialog">&times;</button>
      <div class="modal__icon ${data.icon}">${iconFor(type)}</div>
      <h3 class="modal__title">${data.title}</h3>
      <p class="modal__text">${data.text}</p>
      <div class="modal__actions">${data.actions}</div>
    `;
    modalBackdrop.classList.add('is-open');
    modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const first = $('.modal__close', modal);
    if (first) first.focus();
  }
  function closeModal() {
    if (!modalBackdrop.classList.contains('is-open')) return;
    modalBackdrop.classList.remove('is-open');
    modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  function iconFor(type) {
    if (type === 'destructive' || type === 'error') return '&#9888;';
    if (type === 'success') return '&#10003;';
    return '&#9432;';
  }
  $$('[data-open-modal]').forEach((btn) => {
    btn.addEventListener('click', () => openModal(btn.dataset.openModal));
  });
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', (e) => {
      if (e.target === modalBackdrop || e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalBackdrop.classList.contains('is-open')) closeModal();
      if (e.key === 'Tab' && modalBackdrop.classList.contains('is-open')) trapFocus(modal, e);
    });
  }

  /* ---------- drawer ---------- */
  const drawer = $('#drawer');
  const drawerBackdrop = $('#drawerBackdrop');
  function openDrawer() {
    lastFocused = document.activeElement;
    drawer.classList.add('is-open');
    drawerBackdrop.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    const first = $('button, a, input', drawer);
    if (first) first.focus();
  }
  function closeDrawer() {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    drawerBackdrop.classList.remove('is-open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  }
  $$('[data-open-drawer]').forEach((btn) => btn.addEventListener('click', openDrawer));
  $$('[data-close-drawer]').forEach((btn) => btn.addEventListener('click', closeDrawer));
  if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);
  if (drawer) {
    drawer.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeDrawer();
      if (e.key === 'Tab') trapFocus(drawer, e);
    });
  }

  /* ---------- toast system ---------- */
  const toastRegion = $('#toastRegion');
  const toastData = {
    success: { title: 'Changes saved', text: 'The weekly schedule has been updated for all rooms.', icon: '&#10003;' },
    error: { title: 'Something went wrong', text: 'The invoice failed to send. Please try again.', icon: '&#9888;' },
    warning: { title: 'Capacity nearly reached', text: 'Sunflower Room is at 18 of 20 enrolled children.', icon: '&#9888;' },
    info: { title: 'New message', text: 'A parent replied in the Sunflower Room thread.', icon: '&#9432;' },
  };
  function showToast(type, override) {
    const data = override || toastData[type] || toastData.info;
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="toast__icon">${data.icon}</span>
      <span>
        <div class="toast__title">${data.title}</div>
        <div class="toast__text">${data.text}</div>
      </span>
      <span class="toast__close" role="button" tabindex="0" aria-label="Dismiss notification">&times;</span>
    `;
    toastRegion.appendChild(toast);
    const remove = () => {
      toast.classList.add('is-leaving');
      setTimeout(() => toast.remove(), 220);
    };
    const timer = setTimeout(remove, 5000);
    toast.querySelector('.toast__close').addEventListener('click', () => { clearTimeout(timer); remove(); });
  }
  $$('[data-toast]').forEach((btn) => btn.addEventListener('click', () => showToast(btn.dataset.toast)));

  /* ---------- button playground ---------- */
  const playVariant = $('#playVariant');
  const playSize = $('#playSize');
  const playState = $('#playState');
  const playPreviewBtn = $('#playPreviewBtn');
  function updatePlayground() {
    if (!playPreviewBtn) return;
    playPreviewBtn.className = 'btn';
    playPreviewBtn.classList.add(`btn--${playVariant.value}`);
    if (playSize.value !== 'md') playPreviewBtn.classList.add(`btn--${playSize.value}`);
    playPreviewBtn.disabled = false;
    playPreviewBtn.classList.remove('is-loading', 'is-success');
    if (playState.value === 'disabled') playPreviewBtn.disabled = true;
    if (playState.value === 'loading') playPreviewBtn.classList.add('is-loading');
    if (playState.value === 'success') playPreviewBtn.classList.add('is-success');
  }
  [playVariant, playSize, playState].forEach((el) => el && el.addEventListener('change', updatePlayground));
  updatePlayground();

  /* ---------- responsive preview switcher ---------- */
  const previewButtons = $$('.preview-controls [data-size]');
  const deviceFrame = $('#deviceFrame');
  previewButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      previewButtons.forEach((b) => b.classList.remove('btn--primary'));
      previewButtons.forEach((b) => b.classList.add('btn--secondary'));
      btn.classList.remove('btn--secondary');
      btn.classList.add('btn--primary');
      deviceFrame.dataset.size = btn.dataset.size;
      $('#deviceFrameLabel').textContent = btn.dataset.size + 'px viewport';
    });
  });

  /* ---------- current year ---------- */
  const yearEl = $('#currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- hero stat count-up ---------- */
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  $$('.hero__stats .stat-card__value').forEach((el) => {
    const match = el.textContent.match(/^(\d+)(.*)$/);
    if (!match) return;
    const target = Number(match[1]);
    const suffix = match[2];
    if (prefersReducedMotion) return;
    const start = performance.now() + 500;
    el.textContent = '0' + suffix;
    const tick = (now) => {
      const p = Math.min(1, Math.max(0, (now - start) / 900));
      el.textContent = Math.round(p * target) + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });

  /* ---------- scroll reveal ---------- */
  const revealTargets = $$('.section-head, .surface-demo, .app-preview, .transform-card, .stat-card');
  revealTargets.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = `${Math.min(i % 6, 5) * 60}ms`;
  });
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    $$('.reveal').forEach((el) => revealObserver.observe(el));
  } else {
    $$('.reveal').forEach((el) => el.classList.add('is-visible'));
  }

  /* ---------- typography lab ---------- */
  const typeLabSize = $('#typeLabSize');
  const typeLabWeight = $('#typeLabWeight');
  const typeLabLeading = $('#typeLabLeading');
  const typeLabPreview = $('#typeLabPreview');
  function updateTypeLab() {
    if (!typeLabPreview) return;
    const size = typeLabSize.value;
    const weight = typeLabWeight.value;
    const leading = (typeLabLeading.value / 100).toFixed(2);
    typeLabPreview.style.fontSize = size + 'px';
    typeLabPreview.style.fontWeight = weight;
    typeLabPreview.style.lineHeight = leading;
    $('#typeLabSizeOut').textContent = size + 'px';
    $('#typeLabWeightOut').textContent = weight;
    $('#typeLabLeadingOut').textContent = leading;
  }
  [typeLabSize, typeLabWeight, typeLabLeading].forEach((el) => el && el.addEventListener('input', updateTypeLab));

  /* ---------- progress animation (plays once visible) ---------- */
  function animateProgress() {
    const linear = $('#progressLinear');
    if (linear) linear.style.width = linear.dataset.target + '%';
    const upload = $('#progressUpload');
    if (upload) upload.style.width = upload.dataset.target + '%';
    $$('.step-progress__seg span').forEach((span) => { span.style.width = span.dataset.target + '%'; });
    const circle = $('#progressCircle');
    const circleLabel = $('#progressCircleLabel');
    if (circle) {
      const target = Number(circle.dataset.target);
      const offset = 251 - (251 * target) / 100;
      circle.style.strokeDashoffset = offset;
      if (circleLabel) {
        const start = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - start) / 1000);
          circleLabel.textContent = Math.round(p * target) + '%';
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }
  }
  const progressSection = $('#progressLinear');
  if (progressSection && 'IntersectionObserver' in window) {
    const progObserver = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) { animateProgress(); obs.disconnect(); }
        });
      },
      { threshold: 0.4 }
    );
    progObserver.observe(progressSection);
  } else if (progressSection) {
    animateProgress();
  }

  /* ---------- stepper ---------- */
  const stepper = $('#stepper');
  if (stepper) {
    const steps = $$('.stepper__step', stepper);
    steps.forEach((step, i) => {
      step.addEventListener('click', () => {
        steps.forEach((s, j) => {
          s.classList.remove('is-current', 'is-complete', 'is-error');
          if (j < i) s.classList.add('is-complete');
          if (j === i) s.classList.add('is-current');
        });
      });
    });
  }

  /* ---------- pagination ---------- */
  const pagination = $('#pagination');
  if (pagination) {
    const pageBtns = $$('.pagination__btn[data-page]', pagination).filter((b) => !isNaN(Number(b.dataset.page)));
    pagination.addEventListener('click', (e) => {
      const btn = e.target.closest('.pagination__btn');
      if (!btn || btn.disabled) return;
      const prevBtn = $('[data-page="prev"]', pagination);
      const nextBtn = $('[data-page="next"]', pagination);
      let current = pageBtns.findIndex((b) => b.getAttribute('aria-current') === 'true');
      if (btn.dataset.page === 'prev') { current = Math.max(0, current - 1); }
      else if (btn.dataset.page === 'next') { current = Math.min(pageBtns.length - 1, current + 1); }
      else { current = pageBtns.indexOf(btn); }
      pageBtns.forEach((b, i) => b.setAttribute('aria-current', String(i === current)));
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === pageBtns.length - 1;
    });
  }

  /* ---------- generic popover ---------- */
  $$('.popover').forEach((pop) => {
    const trigger = $('button', pop);
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const willOpen = !pop.classList.contains('is-open');
      $$('.popover.is-open').forEach((p) => { p.classList.remove('is-open'); $('button', p).setAttribute('aria-expanded', 'false'); });
      if (willOpen) { pop.classList.add('is-open'); trigger.setAttribute('aria-expanded', 'true'); }
    });
  });
  document.addEventListener('click', () => $$('.popover.is-open').forEach((p) => { p.classList.remove('is-open'); $('button', p).setAttribute('aria-expanded', 'false'); }));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.popover.is-open').forEach((p) => { p.classList.remove('is-open'); $('button', p).setAttribute('aria-expanded', 'false'); });
  });

  /* ---------- notification center ---------- */
  $$('.notif-item__dismiss').forEach((btn) => {
    const dismiss = () => {
      const item = btn.closest('.notif-item');
      item.classList.add('is-leaving');
      setTimeout(() => item.remove(), 200);
    };
    btn.addEventListener('click', dismiss);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); } });
  });
  const notifMarkAll = $('#notifMarkAll');
  if (notifMarkAll) notifMarkAll.addEventListener('click', () => $$('.notif-item.is-unread').forEach((item) => item.classList.remove('is-unread')));

  /* ---------- favourites / pinning ---------- */
  function getPins() {
    try { return JSON.parse(localStorage.getItem('t00-pins') || '{}'); } catch (e) { return {}; }
  }
  function setPin(id, value) {
    try {
      const pins = getPins();
      pins[id] = value;
      localStorage.setItem('t00-pins', JSON.stringify(pins));
    } catch (e) { /* storage unavailable — pin state just won't persist */ }
  }
  $$('.favorite-btn').forEach((btn) => {
    const id = btn.dataset.pinId || btn.textContent.trim();
    if (getPins()[id]) btn.classList.add('is-pinned');
    btn.addEventListener('click', () => {
      const pinned = btn.classList.toggle('is-pinned');
      btn.classList.add('is-bounce');
      setTimeout(() => btn.classList.remove('is-bounce'), 450);
      setPin(id, pinned);
      showToast('info', {
        title: pinned ? 'Pinned' : 'Unpinned',
        text: pinned ? `${id} added to your favourites.` : `${id} removed from favourites.`,
        icon: pinned ? '&#10084;' : '&#9711;',
      });
    });
  });

  /* ---------- header search ---------- */
  const headerSearch = $('#headerSearch');
  if (headerSearch) {
    headerSearch.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const q = headerSearch.value.trim().toLowerCase();
      if (!q) return;
      const match = $$('.section').find((sec) => sec.textContent.toLowerCase().includes(q));
      if (match) {
        match.scrollIntoView({ behavior: 'smooth', block: 'start' });
        match.classList.remove('is-search-match');
        requestAnimationFrame(() => match.classList.add('is-search-match'));
        setTimeout(() => match.classList.remove('is-search-match'), 1300);
      }
    });
  }

  /* ---------- command palette ---------- */
  const commandBackdrop = $('#commandBackdrop');
  const commandInput = $('#commandInput');
  const commandList = $('#commandList');
  const commandTrigger = $('#commandTrigger');
  const commandIndex = [
    { label: 'Colour tokens', target: '#foundations' },
    { label: 'Typography lab', target: '#foundations' },
    { label: 'Spacing scale', target: '#foundations' },
    { label: 'Glass & surface lab', target: '#foundations' },
    { label: 'Buttons', target: '#components' },
    { label: 'Inputs', target: '#components' },
    { label: 'Cards', target: '#components' },
    { label: 'Tabs', target: '#components' },
    { label: 'Filters', target: '#components' },
    { label: 'Table', target: '#components' },
    { label: 'Modals', target: '#components' },
    { label: 'Drawer', target: '#components' },
    { label: 'Icon library', target: '#components' },
    { label: 'Badges', target: '#components' },
    { label: 'Avatars', target: '#components' },
    { label: 'Dropdown & popover', target: '#components' },
    { label: 'Breadcrumbs', target: '#components' },
    { label: 'Pagination', target: '#components' },
    { label: 'Tooltips', target: '#components' },
    { label: 'Progress system', target: '#components' },
    { label: 'Stepper', target: '#components' },
    { label: 'Component playground', target: '#playground' },
    { label: 'Interaction lab', target: '#interaction-lab' },
    { label: 'Real-world compositions', target: '#compositions' },
    { label: 'Notification center', target: '#notifications' },
    { label: 'Responsive preview', target: '#responsive' },
    { label: 'Final gallery', target: '#gallery' },
  ];
  let commandActiveIndex = -1;
  function renderCommandList(query) {
    const q = query.trim().toLowerCase();
    const items = commandIndex.filter((item) => !q || item.label.toLowerCase().includes(q));
    commandActiveIndex = items.length ? 0 : -1;
    if (!items.length) {
      commandList.innerHTML = '<div class="command-palette__empty">No matches — try a different term.</div>';
      return;
    }
    commandList.innerHTML = items
      .map(
        (item, i) => `<div class="command-palette__item${i === 0 ? ' is-active' : ''}" data-target="${item.target}" role="option">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          ${item.label}
        </div>`
      )
      .join('');
  }
  function openCommandPalette() {
    if (!commandBackdrop) return;
    commandBackdrop.classList.add('is-open');
    commandBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    commandInput.value = '';
    renderCommandList('');
    setTimeout(() => commandInput.focus(), 50);
  }
  function closeCommandPalette() {
    if (!commandBackdrop || !commandBackdrop.classList.contains('is-open')) return;
    commandBackdrop.classList.remove('is-open');
    commandBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function goToCommandItem(el) {
    if (!el) return;
    const target = $(el.dataset.target);
    closeCommandPalette();
    if (target) setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  }
  if (commandBackdrop) {
    if (commandTrigger) commandTrigger.addEventListener('click', openCommandPalette);
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        commandBackdrop.classList.contains('is-open') ? closeCommandPalette() : openCommandPalette();
      } else if (e.key === 'Escape' && commandBackdrop.classList.contains('is-open')) {
        closeCommandPalette();
      }
    });
    commandBackdrop.addEventListener('click', (e) => { if (e.target === commandBackdrop) closeCommandPalette(); });
    commandInput.addEventListener('input', () => renderCommandList(commandInput.value));
    commandList.addEventListener('click', (e) => goToCommandItem(e.target.closest('.command-palette__item')));
    commandInput.addEventListener('keydown', (e) => {
      const items = $$('.command-palette__item', commandList);
      if (!items.length) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); commandActiveIndex = Math.min(items.length - 1, commandActiveIndex + 1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); commandActiveIndex = Math.max(0, commandActiveIndex - 1); }
      else if (e.key === 'Enter') { e.preventDefault(); goToCommandItem(items[commandActiveIndex]); return; }
      else return;
      items.forEach((it, i) => it.classList.toggle('is-active', i === commandActiveIndex));
      items[commandActiveIndex].scrollIntoView({ block: 'nearest' });
    });
  }

  /* ---------- component playground (multi-component) ---------- */
  const pgComponent = $('#pgComponent');
  const pgVariant = $('#pgVariant');
  const pgSize = $('#pgSize');
  const pgState = $('#pgState');
  const pgPreview = $('#pgPreview');
  const pgConfig = {
    button: {
      variants: ['primary', 'secondary', 'ghost', 'destructive'],
      sizes: ['sm', 'md', 'lg'],
      states: ['default', 'disabled', 'loading', 'success'],
      render(variant, size, state) {
        const sizeClass = size !== 'md' ? ` btn--${size}` : '';
        const disabled = state === 'disabled' ? ' disabled' : '';
        const loading = state === 'loading' ? ' is-loading' : '';
        const success = state === 'success' ? ' is-success' : '';
        return `<button class="btn btn--${variant}${sizeClass}${loading}${success}" type="button"${disabled}>Continue<span class="btn__spinner" aria-hidden="true"></span></button>`;
      },
    },
    input: {
      variants: ['text', 'search', 'password'],
      sizes: ['sm', 'md', 'lg'],
      states: ['default', 'disabled', 'error', 'success'],
      render(variant, size, state) {
        const h = size === 'sm' ? 'var(--control-h-sm)' : size === 'lg' ? 'var(--control-h-lg)' : 'var(--control-h-md)';
        const cls = state === 'error' ? ' style="border-color: var(--color-error);"' : state === 'success' ? ' style="border-color: var(--color-success);"' : '';
        const disabled = state === 'disabled' ? ' disabled' : '';
        return `<input class="input" style="height:${h}; width:240px;" type="${variant}" placeholder="Nithya's workspace"${cls}${disabled} />`;
      },
    },
    badge: {
      variants: ['success', 'warning', 'error', 'primary', 'neutral'],
      sizes: ['sm', 'md', 'lg'],
      states: ['default', 'outline'],
      render(variant, size, state) {
        const fs = size === 'sm' ? '0.65rem' : size === 'lg' ? '0.95rem' : '0.8125rem';
        const outline = state === 'outline' ? ' badge--outline' : '';
        return `<span class="badge badge--${variant}${outline}" style="font-size:${fs};">Active</span>`;
      },
    },
    card: {
      variants: ['basic', 'glass', 'selected', 'disabled'],
      sizes: ['sm', 'md', 'lg'],
      states: ['default', 'interactive'],
      render(variant, size, state) {
        const w = size === 'sm' ? '180px' : size === 'lg' ? '320px' : '240px';
        const variantClass = variant === 'basic' ? '' : ` card--${variant}`;
        const interactive = state === 'interactive' ? ' card--interactive' : '';
        return `<div class="card${variantClass}${interactive}" style="width:${w};" tabindex="0"><span class="card__eyebrow">Nithya's room</span><div class="card__title">Sunflower Room</div><p class="card__text">Toddlers · 16 of 20 seats filled.</p></div>`;
      },
    },
    toggle: {
      variants: ['default'],
      sizes: ['sm', 'md'],
      states: ['off', 'on', 'disabled'],
      render(variant, size, state) {
        const checked = state === 'on' ? ' checked' : '';
        const disabled = state === 'disabled' ? ' disabled' : '';
        const scale = size === 'sm' ? ' style="transform: scale(0.85);"' : '';
        return `<span class="toggle"${scale}><input type="checkbox"${checked}${disabled} /><span class="toggle__track"><span class="toggle__thumb"></span></span></span>`;
      },
    },
  };
  const pgLabels = { sm: 'Small', md: 'Medium', lg: 'Large', text: 'Text', search: 'Search', password: 'Password', off: 'Off', on: 'On' };
  function fillSelect(select, values) {
    select.innerHTML = values
      .map((v) => `<option value="${v}">${pgLabels[v] || v.charAt(0).toUpperCase() + v.slice(1)}</option>`)
      .join('');
  }
  function updatePgPreview() {
    if (!pgComponent) return;
    const cfg = pgConfig[pgComponent.value];
    pgPreview.innerHTML = cfg.render(pgVariant.value, pgSize.value, pgState.value);
  }
  function updatePgComponent() {
    const cfg = pgConfig[pgComponent.value];
    fillSelect(pgVariant, cfg.variants);
    fillSelect(pgSize, cfg.sizes);
    fillSelect(pgState, cfg.states);
    updatePgPreview();
  }
  if (pgComponent) {
    pgComponent.addEventListener('change', updatePgComponent);
    [pgVariant, pgSize, pgState].forEach((el) => el.addEventListener('change', updatePgPreview));
    updatePgComponent();
  }
})();
