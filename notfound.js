/* ==========================================================================
   PLAY SCHOOL — 404 page logic
   Mounts inside the app shell when logged in, or a bare centered layout
   when logged out. Wires the dashboard/back actions and the global search.
   ========================================================================== */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const content = document.getElementById('notfoundContent');
    const loggedIn = window.PlayShell && window.PlayShell.isLoggedIn();

    if (loggedIn) {
      const bareHeader = document.getElementById('notfoundBareHeader');
      if (bareHeader) bareHeader.remove();
      const appContent = window.PlayShell.mount('', 'Page not found');
      appContent.classList.add('app-content--center');
      appContent.appendChild(content);
      document.body.classList.add('is-app');
    } else {
      document.body.classList.add('is-guest');
    }

    content.hidden = false;
    wireActions();
    wireSearch();
  }

  function wireActions() {
    const backBtn = document.getElementById('nfBackBtn');
    if (!backBtn) return;
    backBtn.addEventListener('click', () => {
      let sameOriginReferrer = false;
      try { sameOriginReferrer = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch (e) { /* ignore */ }
      if (window.history.length > 1 && sameOriginReferrer) {
        window.history.back();
      } else {
        window.location.href = 'dashboard.html';
      }
    });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function wireSearch() {
    const input = document.getElementById('nfSearchInput');
    const dropdown = document.getElementById('nfSearchDropdown');
    if (!input || !dropdown) return;

    let results = [];
    let activeIndex = -1;
    let open = false;

    function render() {
      if (!results.length) {
        dropdown.innerHTML = '<div class="search-dropdown__empty">No matching records found.</div>';
        input.removeAttribute('aria-activedescendant');
        return;
      }
      dropdown.innerHTML = results
        .map((r, i) => {
          const secondary = window.PlayStore ? window.PlayStore.secondaryLine(r) : '';
          return `
            <div class="search-dropdown__item${i === activeIndex ? ' is-active' : ''}" role="option" data-index="${i}" id="nfResult-${i}" aria-selected="${i === activeIndex}">
              <div class="search-dropdown__item-top">
                <span class="search-dropdown__name">${escapeHtml(r.name)}</span>
                <span class="search-dropdown__meta">${escapeHtml(r.id)}</span>
              </div>
              <span class="search-dropdown__meta">${escapeHtml(r.type)} · ${escapeHtml(secondary)}</span>
            </div>
          `;
        })
        .join('');
      if (activeIndex >= 0) input.setAttribute('aria-activedescendant', 'nfResult-' + activeIndex);
      else input.removeAttribute('aria-activedescendant');
    }

    function openDropdown() {
      open = true;
      dropdown.hidden = false;
      requestAnimationFrame(() => dropdown.setAttribute('data-open', 'true'));
      input.setAttribute('aria-expanded', 'true');
    }
    function closeDropdown() {
      open = false;
      dropdown.setAttribute('data-open', 'false');
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      activeIndex = -1;
      setTimeout(() => { if (!open) dropdown.hidden = true; }, 160);
    }
    function doSearch() {
      const q = input.value.trim();
      if (!q) { closeDropdown(); return; }
      results = window.PlayStore ? window.PlayStore.search(q) : [];
      activeIndex = -1;
      render();
      openDropdown();
    }
    function goToResult(r) {
      window.location.href = `record.html?type=${encodeURIComponent(r.type)}&id=${encodeURIComponent(r.id)}`;
    }
    function scrollActiveIntoView() {
      const el = document.getElementById('nfResult-' + activeIndex);
      if (el) el.scrollIntoView({ block: 'nearest' });
    }

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (open && activeIndex >= 0 && results[activeIndex]) goToResult(results[activeIndex]);
        else doSearch();
      } else if (e.key === 'ArrowDown') {
        if (!open || !results.length) return;
        e.preventDefault();
        activeIndex = Math.min(results.length - 1, activeIndex + 1);
        render();
        scrollActiveIntoView();
      } else if (e.key === 'ArrowUp') {
        if (!open || !results.length) return;
        e.preventDefault();
        activeIndex = Math.max(0, activeIndex - 1);
        render();
        scrollActiveIntoView();
      } else if (e.key === 'Escape') {
        if (open) { e.preventDefault(); closeDropdown(); }
      }
    });

    dropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.search-dropdown__item');
      if (!item) return;
      const idx = Number(item.dataset.index);
      if (results[idx]) goToResult(results[idx]);
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.notfound__search')) closeDropdown();
    });
  }
})();
