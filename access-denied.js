/* ==========================================================================
   PLAY SCHOOL — Access denied page logic
   Reads ?role= and ?page= from the URL (sensible defaults if absent),
   renders the dynamic copy, and drives the request-access flow.
   ========================================================================== */
(function () {
  'use strict';

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  const SENT_KEY = 'ps_access_requests_sent';
  function getSentMap() {
    try { return JSON.parse(localStorage.getItem(SENT_KEY) || '{}'); } catch (e) { return {}; }
  }
  function markSent(page) {
    const map = getSentMap();
    map[page] = true;
    try { localStorage.setItem(SENT_KEY, JSON.stringify(map)); } catch (e) { /* storage unavailable */ }
  }

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    const params = new URLSearchParams(window.location.search);
    const role = params.get('role') || 'Teacher';
    const page = params.get('page') || 'Payroll';

    const appContent = window.PlayShell.mount('', 'Access denied');
    const template = $('#adTemplate');
    appContent.classList.add('app-content--center');
    appContent.appendChild(template.content.cloneNode(true));

    $('#adText').innerHTML = `Your role (<b>${escapeHtml(role)}</b>) doesn't include access to <b>${escapeHtml(page)}</b>. Ask your school director if you need it.`;
    document.title = `Access denied — ${page} — Play School`;

    const requestBtn = $('#adRequestBtn');
    const alreadySent = !!getSentMap()[page];
    if (alreadySent) setSentState(requestBtn);

    requestBtn.addEventListener('click', () => openModal(role, page));
    $('#adBackBtn').addEventListener('click', () => {
      let sameOriginReferrer = false;
      try { sameOriginReferrer = !!document.referrer && new URL(document.referrer).origin === window.location.origin; } catch (e) { /* ignore */ }
      if (window.history.length > 1 && sameOriginReferrer) window.history.back();
      else window.location.href = 'dashboard.html';
    });

    wireModal(role, page);
  }

  function setSentState(btn) {
    btn.disabled = true;
    btn.textContent = 'Request sent';
  }

  function openModal(role, page) {
    const backdrop = $('#adModalBackdrop');
    $('#adModalPageName').textContent = page;
    $('#adReason').value = '';
    $('#adReasonCount').textContent = '0 / 300';
    backdrop.classList.add('is-open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('#adReason').focus(), 50);
  }
  function closeModal() {
    const backdrop = $('#adModalBackdrop');
    if (!backdrop.classList.contains('is-open')) return;
    backdrop.classList.remove('is-open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showToast(title) {
    const region = $('#adToastRegion');
    const toast = document.createElement('div');
    toast.className = 'toast toast--success';
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
      <span class="toast__icon">&#10003;</span>
      <span><div class="toast__title">${escapeHtml(title)}</div></span>
      <span class="toast__close" role="button" tabindex="0" aria-label="Dismiss notification">&times;</span>
    `;
    region.appendChild(toast);
    const remove = () => { toast.classList.add('is-leaving'); setTimeout(() => toast.remove(), 220); };
    const timer = setTimeout(remove, 4500);
    toast.querySelector('.toast__close').addEventListener('click', () => { clearTimeout(timer); remove(); });
  }

  function wireModal(role, page) {
    const backdrop = $('#adModalBackdrop');
    const reasonInput = $('#adReason');
    const countEl = $('#adReasonCount');

    reasonInput.addEventListener('input', () => {
      countEl.textContent = `${reasonInput.value.length} / 300`;
    });

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop || e.target.closest('[data-close]')) closeModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal();
    });

    $('#adSendBtn').addEventListener('click', () => {
      const reason = reasonInput.value.trim();
      markSent(page);
      closeModal();
      showToast('Request sent to your director');
      setSentState($('#adRequestBtn'));
      window.PlayShell.addNotification({
        title: 'Access request',
        text: `A ${role} requested access to ${page}${reason ? ' — "' + reason + '"' : ''}.`,
        forRole: 'Director',
        module: null,
        mention: true,
      });
    });
  }
})();
