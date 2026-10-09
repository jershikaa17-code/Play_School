/* ==========================================================================
   PLAY SCHOOL — Notifications history
   Single source of truth: window.PlayShell's notification store (shell.js).
   No competing array — every list here is derived live from
   PlayShell.getNotifications(), same as the bell dropdown.
   ========================================================================== */
(function () {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const ICON_GENERAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>';

  let activeTab = 'all';
  let filterModules = new Set();
  let filterStart = '';
  let filterEnd = '';
  let selectedIds = new Set();
  let pendingBulkDeleteIds = null;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    window.PlayShell.login();
    window.PlayShell.mount('', 'Notifications');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    wireTabs();
    wireHeaderActions();
    wireFilters();
    wireBulkBar();
    wireModals();
    render();
  }

  /* ---------- time helpers ---------- */
  function localDateStr(d) {
    const dt = new Date(d);
    return dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
  }
  function relativeTime(iso) {
    const then = new Date(iso);
    const diffMs = Date.now() - then.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + ' min ago';
    const today = localDateStr(new Date());
    const thatDay = localDateStr(then);
    const hrs = Math.floor(mins / 60);
    if (thatDay === today) return hrs === 1 ? '1 hour ago' : hrs + ' hours ago';
    const yesterday = localDateStr(new Date(Date.now() - 86400000));
    if (thatDay === yesterday) return 'Yesterday';
    const days = Math.floor(hrs / 24);
    return days + 'd ago';
  }
  function groupLabel(iso) {
    const today = localDateStr(new Date());
    const yesterday = localDateStr(new Date(Date.now() - 86400000));
    const d = localDateStr(iso);
    if (d === today) return 'Today';
    if (d === yesterday) return 'Yesterday';
    return 'Earlier';
  }

  /* ---------- data ---------- */
  function allNotifications() {
    return window.PlayShell.getNotifications().slice().sort((a, b) => new Date(b.time) - new Date(a.time));
  }
  function moduleLabel(moduleId) {
    if (!moduleId) return 'General';
    const mod = window.PlayModules && window.PlayModules.getById(moduleId);
    return mod ? mod.navLabel : moduleId;
  }
  function moduleIcon(moduleId) {
    if (!moduleId) return ICON_GENERAL;
    const mod = window.PlayModules && window.PlayModules.getById(moduleId);
    return (mod && mod.icon) || ICON_GENERAL;
  }
  function availableModuleOptions() {
    const seen = new Map();
    allNotifications().forEach((n) => {
      const key = n.module || '__general__';
      if (!seen.has(key)) seen.set(key, moduleLabel(n.module));
    });
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }

  function passesFilters(n) {
    if (filterModules.size) {
      const key = n.module || '__general__';
      if (!filterModules.has(key)) return false;
    }
    if (filterStart && localDateStr(n.time) < filterStart) return false;
    if (filterEnd && localDateStr(n.time) > filterEnd) return false;
    return true;
  }
  function passesTab(n) {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'mentions') return !!n.mention;
    return true;
  }

  function visibleList() {
    return allNotifications().filter((n) => passesFilters(n) && passesTab(n));
  }

  /* ---------- render ---------- */
  function render() {
    renderModuleChecks();
    renderTabs();
    renderList();
  }

  function renderModuleChecks() {
    const options = availableModuleOptions();
    const html = options.length
      ? options.map((o) => `
        <div class="check-row" style="margin-bottom: var(--space-2);">
          <input type="checkbox" class="checkbox" id="mod-${o.key}" value="${o.key}" ${filterModules.has(o.key) ? 'checked' : ''} />
          <label for="mod-${o.key}" style="font-size: var(--fs-body-sm);">${escapeHtml(o.label)}</label>
        </div>`).join('')
      : '<p class="card__text" style="font-size: var(--fs-caption);">No modules yet.</p>';
    $('notifModuleChecks').innerHTML = html;
    $('notifModuleChecksMobile').innerHTML = html.replace(/id="mod-/g, 'id="mod-m-');

    $('notifModuleChecks').querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        toggleFilterModule(cb.value, cb.checked);
        render();
      });
    });
  }

  function toggleFilterModule(key, checked) {
    if (checked) filterModules.add(key); else filterModules.delete(key);
  }

  function renderTabs() {
    const unread = allNotifications().filter((n) => !n.read).length;
    $('notifUnreadCount').textContent = unread ? `(${unread})` : '';
    document.querySelectorAll('.notif-tab').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.tab === activeTab);
    });
    const activeBtn = document.querySelector(`.notif-tab[data-tab="${activeTab}"]`);
    const indicator = $('notifTabIndicator');
    if (activeBtn) {
      indicator.style.left = activeBtn.offsetLeft + 'px';
      indicator.style.width = activeBtn.offsetWidth + 'px';
    }
  }

  function renderList() {
    const list = visibleList();
    const container = $('notifList');
    selectedIds = new Set(Array.from(selectedIds).filter((id) => list.some((n) => n.id === id)));

    if (!list.length) {
      $('notifSelectAllRow').hidden = true;
      container.innerHTML = emptyStateHtml();
      renderBulkBar();
      return;
    }
    $('notifSelectAllRow').hidden = false;
    $('notifSelectAll').checked = selectedIds.size > 0 && selectedIds.size === list.length;
    $('notifSelectAll').indeterminate = selectedIds.size > 0 && selectedIds.size < list.length;

    let currentGroup = null;
    let html = '';
    list.forEach((n, i) => {
      const g = groupLabel(n.time);
      if (g !== currentGroup) { html += `<div class="notif-group-label">${g}</div>`; currentGroup = g; }
      html += rowHtml(n, i);
    });
    container.innerHTML = html;
    wireRows();
    renderBulkBar();
  }

  function rowHtml(n, i) {
    const selected = selectedIds.has(n.id);
    return `
      <div class="notif-row${n.read ? '' : ' is-unread'}${selected ? ' is-selected' : ''}" data-id="${n.id}" tabindex="0" role="button" style="animation-delay:${Math.min(i, 8) * 30}ms">
        <span class="notif-row__unread-dot" aria-hidden="true"></span>
        <input type="checkbox" class="checkbox notif-row__select" data-select="${n.id}" ${selected ? 'checked' : ''} aria-label="Select notification" />
        <span class="notif-row__icon">${moduleIcon(n.module)}</span>
        <span class="notif-row__body">
          <span class="notif-row__title">${escapeHtml(n.title)}</span>
          <div class="notif-row__text">${escapeHtml(n.text)}</div>
          <div class="notif-row__meta">
            <span>${relativeTime(n.time)}</span>
            ${n.module ? `<span>· ${escapeHtml(moduleLabel(n.module))}</span>` : ''}
            ${n.mention ? '<span>· Mentioned you</span>' : ''}
          </div>
        </span>
        <span class="notif-row__actions">
          <button class="btn btn--icon" type="button" data-read-toggle="${n.id}" aria-label="${n.read ? 'Mark as unread' : 'Mark as read'}" title="${n.read ? 'Mark as unread' : 'Mark as read'}">
            ${n.read
              ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/></svg>'
              : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'}
          </button>
          <button class="btn btn--icon" type="button" data-delete="${n.id}" aria-label="Delete notification" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </span>
        <span class="popover notif-row__overflow">
          <button class="btn btn--icon" type="button" data-overflow-trigger aria-label="More actions" aria-haspopup="true" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
          </button>
          <span class="popover__panel" role="menu" style="right:0; left:auto;">
            <button class="popover__item" type="button" data-read-toggle="${n.id}" role="menuitem">${n.read ? 'Mark as unread' : 'Mark as read'}</button>
            <button class="popover__item popover__item--danger" type="button" data-delete="${n.id}" role="menuitem">Delete</button>
          </span>
        </span>
      </div>`;
  }

  function emptyStateHtml() {
    let title = "You're all caught up";
    let text = 'New activity and important updates will appear here.';
    let showClear = false;

    const hasAny = allNotifications().length > 0;
    const hasFilters = filterModules.size > 0 || filterStart || filterEnd;

    if (hasAny && hasFilters) {
      title = 'No notifications match your filters';
      text = 'Try a different date range or module, or clear your filters.';
      showClear = true;
    } else if (hasAny && activeTab === 'unread') {
      title = "You're all caught up";
      text = 'There are no unread notifications right now.';
    } else if (hasAny && activeTab === 'mentions') {
      title = 'No mentions yet';
      text = "You'll see notifications addressed directly to you here.";
    }

    return `
      <div class="notif-empty">
        <div class="notif-empty__icon">${ICON_GENERAL}</div>
        <div class="notif-empty__title">${escapeHtml(title)}</div>
        <p class="notif-empty__text">${escapeHtml(text)}</p>
        ${showClear ? '<button class="btn btn--secondary notif-empty__action" id="notifEmptyClear" type="button">Clear filters</button>' : ''}
      </div>`;
  }

  function renderBulkBar() {
    const bar = $('notifBulkBar');
    if (!selectedIds.size) { bar.hidden = true; return; }
    bar.hidden = false;
    $('notifBulkCount').textContent = `${selectedIds.size} selected`;
  }

  /* ---------- row wiring ---------- */
  function wireRows() {
    document.querySelectorAll('.notif-row').forEach((row) => {
      const id = row.dataset.id;
      row.addEventListener('click', (e) => {
        if (e.target.closest('[data-select]') || e.target.closest('[data-read-toggle]') || e.target.closest('[data-delete]') || e.target.closest('.notif-row__overflow')) return;
        openNotification(id);
      });
      row.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.target.closest('button') && !e.target.closest('input')) openNotification(id);
      });
    });
    document.querySelectorAll('[data-select]').forEach((cb) => {
      cb.addEventListener('click', (e) => e.stopPropagation());
      cb.addEventListener('change', () => {
        if (cb.checked) selectedIds.add(cb.dataset.select); else selectedIds.delete(cb.dataset.select);
        renderList();
      });
    });
    document.querySelectorAll('[data-read-toggle]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const n = allNotifications().find((x) => x.id === btn.dataset.readToggle);
        if (!n) return;
        window.PlayShell.markNotificationRead(n.id, !n.read);
        render();
        window.PlayShell.toast('success', n.read ? 'Marked as unread' : 'Marked as read');
      });
    });
    document.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        window.PlayShell.deleteNotifications([btn.dataset.delete]);
        selectedIds.delete(btn.dataset.delete);
        render();
        window.PlayShell.toast('success', 'Notification deleted');
      });
    });
    document.querySelectorAll('[data-overflow-trigger]').forEach((trigger) => {
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const pop = trigger.closest('.popover');
        const willOpen = !pop.classList.contains('is-open');
        document.querySelectorAll('.notif-row__overflow.is-open').forEach((p) => p.classList.remove('is-open'));
        pop.classList.toggle('is-open', willOpen);
        trigger.setAttribute('aria-expanded', String(willOpen));
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.notif-row__overflow.is-open').forEach((p) => p.classList.remove('is-open'));
    });
  }

  function openNotification(id) {
    const n = allNotifications().find((x) => x.id === id);
    if (!n) return;
    window.PlayShell.markNotificationRead(id, true);
    if (n.recordRoute) {
      window.location.href = n.recordRoute;
    } else {
      render();
      window.PlayShell.toast('info', 'Marked as read', "This notification doesn't have a linked page yet.");
    }
  }

  /* ---------- tabs ---------- */
  function wireTabs() {
    document.querySelectorAll('.notif-tab').forEach((btn) => {
      btn.addEventListener('click', () => { activeTab = btn.dataset.tab; selectedIds.clear(); render(); });
    });
    window.addEventListener('resize', () => renderTabs());
  }

  /* ---------- header actions ---------- */
  function wireHeaderActions() {
    $('notifMarkAllBtn').addEventListener('click', () => {
      window.PlayShell.markAllNotificationsRead();
      render();
      window.PlayShell.toast('success', 'All caught up', 'Every notification has been marked as read.');
    });
  }

  /* ---------- filters ---------- */
  function wireFilters() {
    $('notifDateStart').addEventListener('change', () => applyDesktopDates());
    $('notifDateEnd').addEventListener('change', () => applyDesktopDates());
    $('notifClearFilters').addEventListener('click', clearFilters);

    $('notifFilterBtn').addEventListener('click', openFilterSheet);
    $('filterSheetBackdrop').addEventListener('click', (e) => { if (e.target.id === 'filterSheetBackdrop') closeFilterSheet(); });
    $('filterSheetClear').addEventListener('click', () => { clearFilters(); closeFilterSheet(); });
    $('filterSheetApply').addEventListener('click', applyMobileFilters);

    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeFilterSheet(); });
    document.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'notifEmptyClear') clearFilters();
    });

    $('notifSelectAll').addEventListener('change', () => {
      const list = visibleList();
      if ($('notifSelectAll').checked) list.forEach((n) => selectedIds.add(n.id));
      else selectedIds.clear();
      renderList();
    });
  }

  function applyDesktopDates() {
    const start = $('notifDateStart').value;
    const end = $('notifDateEnd').value;
    if (start && end && end < start) {
      $('notifDateError').textContent = 'End date must be on or after the start date.';
      $('notifDateError').hidden = false;
      return;
    }
    $('notifDateError').hidden = true;
    filterStart = start;
    filterEnd = end;
    render();
  }
  function clearFilters() {
    filterModules.clear();
    filterStart = '';
    filterEnd = '';
    $('notifDateStart').value = '';
    $('notifDateEnd').value = '';
    $('notifDateStartMobile').value = '';
    $('notifDateEndMobile').value = '';
    $('notifDateError').hidden = true;
    render();
  }
  function openFilterSheet() {
    $('notifDateStartMobile').value = filterStart;
    $('notifDateEndMobile').value = filterEnd;
    document.querySelectorAll('#notifModuleChecksMobile input[type="checkbox"]').forEach((cb) => {
      cb.checked = filterModules.has(cb.value);
    });
    $('filterSheetBackdrop').classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }
  function closeFilterSheet() {
    $('filterSheetBackdrop').classList.remove('is-open');
    document.body.style.overflow = '';
  }
  function applyMobileFilters() {
    const start = $('notifDateStartMobile').value;
    const end = $('notifDateEndMobile').value;
    if (start && end && end < start) {
      $('notifDateErrorMobile').textContent = 'End date must be on or after the start date.';
      $('notifDateErrorMobile').hidden = false;
      return;
    }
    $('notifDateErrorMobile').hidden = true;
    filterModules.clear();
    document.querySelectorAll('#notifModuleChecksMobile input[type="checkbox"]').forEach((cb) => {
      if (cb.checked) filterModules.add(cb.value);
    });
    filterStart = start;
    filterEnd = end;
    $('notifDateStart').value = start;
    $('notifDateEnd').value = end;
    closeFilterSheet();
    render();
  }

  /* ---------- bulk bar ---------- */
  function wireBulkBar() {
    $('notifBulkRead').addEventListener('click', () => {
      window.PlayShell.markNotificationsRead(Array.from(selectedIds), true);
      const count = selectedIds.size;
      selectedIds.clear();
      render();
      window.PlayShell.toast('success', `${count} notification${count === 1 ? '' : 's'} marked as read`);
    });
    $('notifBulkDelete').addEventListener('click', () => {
      pendingBulkDeleteIds = Array.from(selectedIds);
      $('bulkDeleteTitle').textContent = `Delete ${pendingBulkDeleteIds.length} notification${pendingBulkDeleteIds.length === 1 ? '' : 's'}?`;
      openModal('bulkDeleteModalBackdrop');
    });
  }

  /* ---------- modals ---------- */
  function openModal(id) {
    const backdrop = $(id);
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal(id) {
    const backdrop = $(id);
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function wireModals() {
    const backdrop = $('bulkDeleteModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('bulkDeleteModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('bulkDeleteModalBackdrop'); });
    $('bulkDeleteConfirm').addEventListener('click', () => {
      if (!pendingBulkDeleteIds) return;
      const count = pendingBulkDeleteIds.length;
      window.PlayShell.deleteNotifications(pendingBulkDeleteIds);
      pendingBulkDeleteIds = null;
      selectedIds.clear();
      closeModal('bulkDeleteModalBackdrop');
      render();
      window.PlayShell.toast('success', `${count} notification${count === 1 ? '' : 's'} deleted`);
    });
  }
})();
