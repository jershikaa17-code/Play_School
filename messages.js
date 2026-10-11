/* ==========================================================================
   PLAY SCHOOL — Messaging & Communication Hub (S29)
   Reuses: store.js (Message — the SAME record type family.js's "Message"
   button and children.js's broadcast composer already create; Conversation
   is new, threading those same Message records), modules.js (this page is
   the real implementation behind "Parent Communication Hub", Premium-gated
   exactly like attendance.js/planner.js), shell.js (notifications/toasts),
   record.js's RESTRICTED_ROLES precedent (family.js) for custody-alert
   gating.

   HONEST LIMITATIONS (read before trusting a claim this file makes):
   - This is a staff-facing admin tool with one fixed signed-in identity
     (S-3001 "Nithya", same convention as attendance.js/record.js) — there is
     no real guardian login, so a staff-sent message can never show a
     genuinely confirmed "read by guardian" receipt. Read ticks on an
     outgoing family message stay at "Sent"; they only turn into a read
     receipt at the exact moment the demo's simulated reply fires (the
     other party must have read it to reply — an honest, event-driven
     signal, not a fabricated one).
   - "Demo mode" is not a separate flag because this entire project has no
     real backend of any kind (every page here is a static, localStorage-only
     demo) — DEMO_MODE below is `true` for that documented reason, so the
     simulated reply never needs to distinguish a "real" deployment that
     doesn't exist.
   - Attachments use FileReader to embed the real file as a data URL on the
     Message record (an actual, non-simulated local persistence) because no
     server-side file storage/CDN exists in this project — never a fake
     "uploaded" state for a file that wasn't actually captured.
   - Translation: no translation provider is configured anywhere in this
     project (confirmed — only a 2-language static template set exists for
     composing NEW broadcasts). Rather than inventing translated text, the
     Translate action shows an honest "no translation provider configured"
     state.
   ========================================================================== */
(function () {
  'use strict';

  const DEMO_MODE = true; // see HONEST LIMITATIONS above — this project has no real backend at all.

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function initials(name) { const p = String(name || '').trim().split(/\s+/); return p[0] ? (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase() : '?'; }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function todayISO() { const d = new Date(); return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
  function uid(prefix) { return prefix + '-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase(); }
  function formatTime(iso) { return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }); }
  function formatDay(iso) {
    const d = new Date(iso.slice(0, 10) + 'T00:00:00');
    const today = new Date(todayISO() + 'T00:00:00');
    const diffDays = Math.round((today - d) / 86400000);
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
  }
  function relativeTime(iso) {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'now';
    if (diffMin < 60) return diffMin + 'm';
    if (diffMin < 24 * 60) return Math.round(diffMin / 60) + 'h';
    return Math.round(diffMin / (24 * 60)) + 'd';
  }
  function currentStaff() { return { id: 'S-3001', name: 'Nithya' }; }
  function hasRole(roles) { return roles.indexOf(role) !== -1; }
  const RESTRICTED_ROLES = ['Director', 'Safeguarding lead'];

  const ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    paperclip: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
    checkDouble: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 7 9 18 4 13"/><polyline points="22 7 13 18 11 15.8"/></svg>',
    x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    file: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
    chevronLeft: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><polyline points="15 18 9 12 15 6"/></svg>',
    chevronRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="15" height="15"><polyline points="9 18 15 12 9 6"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/></svg>',
    alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    inbox: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></svg>',
    users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
    retry: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7"/><polyline points="3 4 3 9 8 9"/></svg>',
  };
  const QUICK_REPLIES = [
    'Thank you for the update.',
    'We will check and get back to you.',
    'Your message has been received.',
    "Noted — I'll pass this on to the team.",
  ];
  const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

  let role = null;
  let activeConversationId = null;
  let activeFilter = 'all';
  let searchQuery = '';
  let contextPanelOpen = true;
  let mobileView = 'list'; // 'list' | 'chat'
  const drafts = {};
  let pendingAttachment = null;
  let translationsShown = new Set();
  let newMsgStep = 1;
  let newMsgType = null;
  let newMsgRecipientId = null;
  let scheduleTargetDraft = null;

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('ps:rolechange', (e) => { role = e.detail.role; render(); });

  function init() {
    window.PlayShell.login();
    role = window.PlayShell.getDemoRole();
    window.PlayShell.mount('communication', 'Messages');
    const pageContent = $('pageContent');
    pageContent.hidden = false;
    document.getElementById('appContent').appendChild(pageContent);

    if (!isModuleUnlocked()) { renderLocked(); return; }
    $('msgMain').hidden = false;

    wireConversationHeader();
    wireComposer();
    wireContextToggle();
    wireNewMessageModal();
    wireScheduleModal();
    wireMobileBack();

    window.setTimeout(() => { $('msgSkeleton').hidden = true; $('msgBody').hidden = false; render(); }, 380);
  }

  function isModuleUnlocked() {
    if (!window.PlayModules) return true;
    const mod = window.PlayModules.getById('communication');
    if (!mod) return true;
    return window.PlayModules.isUnlocked(mod, window.PlayModules.getCurrentPlan());
  }
  function renderLocked() {
    $('msgLocked').hidden = false;
    $('msgMain').hidden = true;
    $('msgLockedIcon').innerHTML = ICON.lock;
    const isAdminish = role === 'Director' || role === 'Admin';
    $('msgLockedAction').innerHTML = isAdminish
      ? `<a class="btn btn--accent" href="plans.html?module=communication&role=${encodeURIComponent(role)}">See plans &amp; upgrade</a>`
      : `<a class="btn btn--secondary" href="module.html?id=communication&role=${encodeURIComponent(role)}">Ask my admin to upgrade</a>`;
  }

  /* ---------- data helpers ---------- */
  function allConversations() { return window.PlayStore.getByType('Conversation'); }
  function messagesFor(convId) { return window.PlayStore.getByType('Message').filter((m) => m.conversationId === convId && m.status !== 'scheduled').sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }
  function scheduledFor(convId) { return window.PlayStore.getByType('Message').filter((m) => m.conversationId === convId && m.status === 'scheduled').sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor)); }
  function familyFor(conv) { return conv.familyId ? window.PlayStore.getById(conv.familyId) : null; }
  function childFor(conv) { return conv.childId ? window.PlayStore.getById(conv.childId) : null; }
  function staffFor(conv) { return conv.staffId ? window.PlayStore.getById(conv.staffId) : null; }
  function classFor(conv) { return conv.classId ? window.PlayStore.getById(conv.classId) : null; }
  function guardiansFor(conv) { const f = familyFor(conv); return f ? (f.guardianIds || []).map((id) => window.PlayStore.getById(id)).filter(Boolean) : []; }

  function conversationTitle(conv) {
    if (conv.kind === 'family') { const f = familyFor(conv); return f ? f.name : 'Family'; }
    if (conv.kind === 'staff') { const s = staffFor(conv); return s ? s.name : 'Staff'; }
    const c = classFor(conv); return c ? c.name + ' — Families' : 'Class group';
  }
  function conversationSubtitle(conv) {
    if (conv.kind === 'family') { const c = childFor(conv); return c ? c.name : ''; }
    if (conv.kind === 'staff') { const s = staffFor(conv); return s ? (s.relation || '') : ''; }
    const c = classFor(conv); return c ? ageRangeLabel(c) : '';
  }
  function formatAgeMonths(months) { months = Number(months) || 0; if (months % 12 === 0) return (months / 12) + (months === 12 ? ' yr' : ' yrs'); const y = Math.floor(months / 12); const m = months % 12; return y > 0 ? y + 'y ' + m + 'mo' : m + ' mo'; }
  function ageRangeLabel(cls) { if (cls.minAgeMonths == null) return cls.ageGroup || ''; return formatAgeMonths(cls.minAgeMonths) + ' – ' + formatAgeMonths(cls.maxAgeMonths); }
  function conversationAvatarInitials(conv) {
    if (conv.kind === 'family') { const f = familyFor(conv); return initials(f ? f.name : 'F'); }
    if (conv.kind === 'staff') { const s = staffFor(conv); return initials(s ? s.name : 'S'); }
    const c = classFor(conv); return initials(c ? c.name : 'G');
  }
  function allMessagesIncludingScheduled(convId) { return window.PlayStore.getByType('Message').filter((m) => m.conversationId === convId); }
  function lastRealMessage(conv) { const msgs = messagesFor(conv.id); return msgs.length ? msgs[msgs.length - 1] : null; }
  function previewText(msg) { if (!msg) return 'No messages yet'; if (msg.body) return msg.body; return (msg.attachments || []).length ? '📎 ' + msg.attachments[0].name : ''; }
  function isUnread(msg) { return msg.senderId !== currentStaff().id && (msg.readBy || []).indexOf(currentStaff().id) === -1; }
  function unreadCountFor(conv) { return messagesFor(conv.id).filter(isUnread).length; }
  function totalUnread() { return allConversations().reduce((sum, c) => sum + unreadCountFor(c), 0); }

  function searchHaystack(conv) {
    const parts = [conversationTitle(conv), conversationSubtitle(conv)];
    messagesFor(conv.id).forEach((m) => parts.push(m.body || ''));
    return parts.join(' ').toLowerCase();
  }
  function filteredConversations() {
    const q = searchQuery.trim().toLowerCase();
    return allConversations().filter((c) => {
      if (activeFilter === 'unread' && unreadCountFor(c) === 0) return false;
      if (activeFilter === 'families' && c.kind !== 'family') return false;
      if (activeFilter === 'staff' && c.kind !== 'staff') return false;
      if (activeFilter === 'groups' && c.kind !== 'group') return false;
      if (q && searchHaystack(c).indexOf(q) === -1) return false;
      return true;
    }).sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
  }

  /* ---------- render orchestration ---------- */
  function render() {
    renderConversationList();
    renderChatPane();
    renderContextPanel();
    $('msgRoot').classList.toggle('msg-root--panel-collapsed', !contextPanelOpen);
    $('msgRoot').classList.toggle('msg-root--mobile-chat', mobileView === 'chat');
  }

  /* ========================================================================
     LEFT PANE — CONVERSATION LIST
     ======================================================================== */
  const FILTERS = [['all', 'All'], ['unread', 'Unread'], ['families', 'Families'], ['staff', 'Staff'], ['groups', 'Groups']];
  function renderConversationList() {
    const unread = totalUnread();
    $('msgUnreadTotal').textContent = unread ? unread + ' unread' : 'All caught up';
    $('msgFilters').innerHTML = FILTERS.map(([k, l]) => `<button class="msg-filter-chip${activeFilter === k ? ' is-active' : ''}" type="button" data-filter="${k}">${l}</button>`).join('');
    $('msgFilters').querySelectorAll('[data-filter]').forEach((btn) => btn.addEventListener('click', () => { activeFilter = btn.dataset.filter; render(); }));

    const convos = filteredConversations();
    const listEl = $('msgConvoList');
    if (!allConversations().length) {
      listEl.innerHTML = '';
      showListEmpty('inbox', 'No conversations yet', 'Start a conversation with a family, staff member or class group.', true);
      return;
    }
    if (!convos.length) {
      listEl.innerHTML = '';
      showListEmpty('search', 'No conversations match', 'Try a different search or filter.', false);
      return;
    }
    $('msgListEmpty').hidden = true;
    listEl.innerHTML = convos.map((c, i) => {
      const last = lastRealMessage(c);
      const unreadCount = unreadCountFor(c);
      const kindIcon = c.kind === 'group' ? ICON.users : '';
      return `
        <button class="msg-convo-row${c.id === activeConversationId ? ' is-active' : ''}${unreadCount ? ' is-unread' : ''}" type="button" data-convo="${c.id}" style="animation-delay:${Math.min(i, 10) * 30}ms;">
          <span class="msg-convo-row__avatar">${escapeHtml(conversationAvatarInitials(c))}${kindIcon ? `<span class="msg-convo-row__kind">${kindIcon}</span>` : ''}</span>
          <span class="msg-convo-row__body">
            <span class="msg-convo-row__top"><span class="msg-convo-row__name">${escapeHtml(conversationTitle(c))}</span><span class="msg-convo-row__time">${last ? relativeTime(last.createdAt) : ''}</span></span>
            ${conversationSubtitle(c) ? `<span class="msg-convo-row__child">${escapeHtml(conversationSubtitle(c))}</span>` : ''}
            <span class="msg-convo-row__preview">${escapeHtml(previewText(last))}</span>
          </span>
          ${unreadCount ? `<span class="msg-unread-badge">${unreadCount}</span>` : ''}
        </button>`;
    }).join('');
    listEl.querySelectorAll('[data-convo]').forEach((btn) => btn.addEventListener('click', () => openConversation(btn.dataset.convo)));
  }
  function showListEmpty(iconKey, title, text, showAction) {
    $('msgListEmpty').hidden = false;
    $('msgListEmptyIcon').innerHTML = iconKey === 'inbox' ? ICON.inbox : ICON.search;
    $('msgListEmptyTitle').textContent = title;
    $('msgListEmptyText').textContent = text;
    $('msgListEmptyAction').innerHTML = showAction ? '<button class="btn btn--accent btn--sm" type="button" id="msgListEmptyNewBtn">Start a conversation</button>' : '';
    if (showAction) $('msgListEmptyNewBtn').addEventListener('click', () => openNewMessageModal());
  }
  function openConversation(convId) {
    activeConversationId = convId;
    mobileView = 'chat';
    markConversationRead(convId);
    render();
    window.setTimeout(scrollChatToBottom, 50);
  }
  function markConversationRead(convId) {
    const staff = currentStaff();
    messagesFor(convId).filter(isUnread).forEach((m) => {
      window.PlayStore.updateRecord(m.id, { readBy: (m.readBy || []).concat(staff.id) });
    });
  }

  /* ========================================================================
     CENTRE PANE — ACTIVE CHAT
     ======================================================================== */
  function scrollChatToBottom() { const el = $('msgThread'); if (el) el.scrollTop = el.scrollHeight; }

  function renderChatPane() {
    const conv = activeConversationId && window.PlayStore.getById(activeConversationId);
    if (!conv) {
      $('msgChatEmpty').hidden = false;
      $('msgChatActive').hidden = true;
      return;
    }
    $('msgChatEmpty').hidden = true;
    $('msgChatActive').hidden = false;

    $('msgChatAvatar').textContent = conversationAvatarInitials(conv);
    $('msgChatTitle').textContent = conversationTitle(conv);
    $('msgChatSubtitle').textContent = conversationSubtitle(conv) || (conv.kind === 'group' ? 'Broadcast to all families' : '');
    $('msgChatKindBadge').textContent = conv.kind === 'family' ? 'Family' : conv.kind === 'staff' ? 'Staff' : 'Class group';

    renderThread(conv);
    renderScheduledStrip(conv);
    renderComposerState(conv);
  }

  function renderThread(conv) {
    const messages = messagesFor(conv.id);
    const staff = currentStaff();
    let html = '';
    let lastDay = null;
    if (!messages.length) {
      html = `<div class="msg-thread-empty">${ICON.inbox}<p>No messages yet. Say hello!</p></div>`;
    } else {
      messages.forEach((m) => {
        const day = m.createdAt.slice(0, 10);
        if (day !== lastDay) { html += `<div class="msg-date-sep"><span>${formatDay(m.createdAt)}</span></div>`; lastDay = day; }
        html += messageBubbleHtml(m, staff);
      });
    }
    $('msgThread').innerHTML = html;
    wireThreadEvents(conv);
    scrollChatToBottom();
  }
  function messageBubbleHtml(m, staff) {
    const mine = m.senderId === staff.id;
    const translated = translationsShown.has(m.id);
    const attachHtml = (m.attachments || []).map((a) => attachmentHtml(a)).join('');
    const canTranslate = !mine && m.body;
    return `
      <div class="msg-bubble-row ${mine ? 'msg-bubble-row--mine' : 'msg-bubble-row--theirs'}" data-message="${m.id}">
        <div class="msg-bubble">
          ${!mine ? `<div class="msg-bubble__sender">${escapeHtml(m.senderName)}</div>` : ''}
          ${m.body ? `<div class="msg-bubble__text">${escapeHtml(m.body)}</div>` : ''}
          ${attachHtml}
          ${translated ? translationBlockHtml(m) : ''}
          <div class="msg-bubble__meta">
            <span>${formatTime(m.createdAt)}</span>
            ${mine ? statusTickHtml(m) : ''}
          </div>
          ${canTranslate ? `<button class="msg-bubble__translate" type="button" data-translate="${m.id}">${ICON.globe}<span>${translated ? 'Hide translation' : 'Translate'}</span></button>` : ''}
        </div>
      </div>`;
  }
  function statusTickHtml(m) {
    if (m.status === 'failed') return `<span class="msg-bubble__status msg-bubble__status--failed">Failed <button type="button" data-retry="${m.id}">Retry</button></span>`;
    if (m.status === 'sending') return `<span class="msg-bubble__status">Sending…</span>`;
    const read = (m.readBy || []).some((id) => id !== m.senderId);
    return `<span class="msg-bubble__status msg-bubble__status--${read ? 'read' : 'sent'}" title="${read ? 'Read' : 'Sent'}">${read ? ICON.checkDouble : ICON.check}</span>`;
  }
  function attachmentHtml(a) {
    if (a.kind === 'image') return `<a class="msg-attachment msg-attachment--image" href="${a.dataUrl}" target="_blank" rel="noopener"><img src="${a.dataUrl}" alt="${escapeHtml(a.name)}" /></a>`;
    return `<a class="msg-attachment msg-attachment--file" href="${a.dataUrl}" target="_blank" rel="noopener">${ICON.file}<span>${escapeHtml(a.name)}</span></a>`;
  }
  function translationBlockHtml(m) {
    const lang = recipientLanguageHint();
    return `<div class="msg-translation"><span class="msg-translation__label">${ICON.globe} Translation${lang ? ' (' + escapeHtml(lang) + ')' : ''} — no translation provider is configured</span><em class="msg-translation__text">This demo has no translation service connected, so the original message above is the only verified text available.</em></div>`;
  }
  function recipientLanguageHint() {
    const conv = window.PlayStore.getById(activeConversationId);
    if (!conv || conv.kind !== 'family') return null;
    const guardians = guardiansFor(conv);
    const g = guardians.find((x) => x.preferredLanguage && x.preferredLanguage !== 'English');
    return g ? g.preferredLanguage : null;
  }
  function wireThreadEvents(conv) {
    $('msgThread').querySelectorAll('[data-translate]').forEach((btn) => btn.addEventListener('click', () => {
      const id = btn.dataset.translate;
      if (translationsShown.has(id)) translationsShown.delete(id); else translationsShown.add(id);
      renderThread(conv);
    }));
    $('msgThread').querySelectorAll('[data-retry]').forEach((btn) => btn.addEventListener('click', () => retrySend(btn.dataset.retry, conv)));
  }

  function renderScheduledStrip(conv) {
    const scheduled = scheduledFor(conv.id);
    const strip = $('msgScheduledStrip');
    if (!scheduled.length) { strip.hidden = true; return; }
    strip.hidden = false;
    strip.innerHTML = scheduled.map((m) => `
      <div class="msg-scheduled-item">
        ${ICON.clock}<span>Scheduled for ${new Date(m.scheduledFor).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}</span>
        <button type="button" data-cancel-scheduled="${m.id}">Cancel</button>
      </div>`).join('');
    strip.querySelectorAll('[data-cancel-scheduled]').forEach((btn) => btn.addEventListener('click', () => {
      window.PlayStore.removeRecord(btn.dataset.cancelScheduled);
      render();
      window.PlayShell.toast('success', 'Scheduled message cancelled', '');
    }));
  }

  /* ---------- composer ---------- */
  function schoolHours() { const s = window.PlayStore.getSettings(); return s.schoolHours || { open: '08:00', close: '18:00' }; }
  function isOutsideSchoolHours() {
    const { open, close } = schoolHours();
    const now = new Date(); const nowMin = now.getHours() * 60 + now.getMinutes();
    const [oh, om] = open.split(':').map(Number); const [ch, cm] = close.split(':').map(Number);
    return !(nowMin >= oh * 60 + om && nowMin < ch * 60 + cm);
  }
  function renderComposerState(conv) {
    $('msgComposerText').value = drafts[conv.id] || '';
    autosizeComposer();
    renderAttachmentPreview();
    const showHoursNote = conv.kind === 'family' && isOutsideSchoolHours();
    $('msgHoursNote').hidden = !showHoursNote;
  }
  function autosizeComposer() {
    const ta = $('msgComposerText');
    ta.style.height = 'auto';
    const lineHeight = 20;
    const maxHeight = lineHeight * 6 + 16;
    ta.style.height = Math.min(ta.scrollHeight, maxHeight) + 'px';
    ta.style.overflowY = ta.scrollHeight > maxHeight ? 'auto' : 'hidden';
  }
  function renderAttachmentPreview() {
    const wrap = $('msgAttachmentPreview');
    if (!pendingAttachment) { wrap.hidden = true; wrap.innerHTML = ''; return; }
    wrap.hidden = false;
    const a = pendingAttachment;
    wrap.innerHTML = a.kind === 'image'
      ? `<div class="msg-attach-chip"><img src="${a.dataUrl}" alt="" /><span>${escapeHtml(a.name)}</span><button type="button" id="msgRemoveAttachment" aria-label="Remove attachment">${ICON.x}</button></div>`
      : `<div class="msg-attach-chip">${ICON.file}<span>${escapeHtml(a.name)}</span><button type="button" id="msgRemoveAttachment" aria-label="Remove attachment">${ICON.x}</button></div>`;
    $('msgRemoveAttachment').addEventListener('click', () => { pendingAttachment = null; renderAttachmentPreview(); });
  }

  function wireComposer() {
    const ta = $('msgComposerText');
    ta.addEventListener('input', () => { if (activeConversationId) drafts[activeConversationId] = ta.value; autosizeComposer(); });
    ta.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } });
    $('msgSendBtn').addEventListener('click', sendMessage);
    $('msgAttachBtn').addEventListener('click', () => $('msgFileInput').click());
    $('msgFileInput').addEventListener('change', handleFileSelect);
    $('msgQuickReplyBtn').addEventListener('click', toggleQuickReplyPanel);
    $('msgQuickReplyPanel').innerHTML = QUICK_REPLIES.map((q) => `<button type="button" class="msg-quick-reply-item" data-quick-reply>${escapeHtml(q)}</button>`).join('');
    $('msgQuickReplyPanel').querySelectorAll('[data-quick-reply]').forEach((btn) => btn.addEventListener('click', () => {
      ta.value = (ta.value ? ta.value + ' ' : '') + btn.textContent;
      if (activeConversationId) drafts[activeConversationId] = ta.value;
      autosizeComposer();
      $('msgQuickReplyPanel').classList.remove('is-open');
      ta.focus();
    }));
    document.addEventListener('click', (e) => { if (!e.target.closest('.msg-quick-reply-wrap')) $('msgQuickReplyPanel').classList.remove('is-open'); });
    $('msgScheduleLink').addEventListener('click', openScheduleModal);
  }
  function toggleQuickReplyPanel(e) { e.stopPropagation(); $('msgQuickReplyPanel').classList.toggle('is-open'); }

  function handleFileSelect() {
    const file = $('msgFileInput').files[0];
    $('msgFileInput').value = '';
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf';
    if (!isImage && !isPdf) { window.PlayShell.toast('error', 'Unsupported file', 'Only images and PDF files can be attached.'); return; }
    if (file.size > MAX_ATTACHMENT_BYTES) { window.PlayShell.toast('error', 'File too large', `Attachments must be under ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)}MB.`); return; }
    const reader = new FileReader();
    reader.onload = () => { pendingAttachment = { name: file.name, size: file.size, kind: isImage ? 'image' : 'pdf', dataUrl: reader.result }; renderAttachmentPreview(); };
    reader.onerror = () => { window.PlayShell.toast('error', "Couldn't attach file", 'The file could not be read. Please try again.'); };
    reader.readAsDataURL(file);
  }

  function sendMessage() {
    const conv = activeConversationId && window.PlayStore.getById(activeConversationId);
    if (!conv) return;
    const text = $('msgComposerText').value.trim();
    const attachment = pendingAttachment;
    if (!text && !attachment) return;
    if ($('msgSendBtn').disabled) return;
    $('msgSendBtn').disabled = true;

    const staff = currentStaff();
    const tempId = 'TEMP-' + Date.now();
    const optimistic = {
      id: tempId, conversationId: conv.id, body: text, attachments: attachment ? [attachment] : [],
      senderType: 'Staff', senderId: staff.id, senderName: staff.name, createdAt: new Date().toISOString(), status: 'sending', readBy: [staff.id],
    };
    $('msgComposerText').value = ''; delete drafts[conv.id]; autosizeComposer();
    pendingAttachment = null; renderAttachmentPreview();

    appendOptimistic(conv, optimistic);

    window.setTimeout(() => {
      try {
        const recipientGuardianIds = conv.kind === 'family' ? guardiansFor(conv).map((g) => g.id) : [];
        const saved = window.PlayStore.addRecord({
          id: uid('MSG'), type: 'Message', conversationId: conv.id, subject: '', body: text,
          recipientGuardianIds, date: todayISO(), createdAt: optimistic.createdAt,
          senderType: 'Staff', senderId: staff.id, senderName: staff.name, status: 'sent',
          attachments: attachment ? [attachment] : [], readBy: [staff.id],
        });
        window.PlayStore.updateRecord(conv.id, { lastMessageAt: saved.createdAt });
        $('msgSendBtn').disabled = false;
        renderThread(conv);
        renderConversationList();
        maybeTriggerDemoReply(conv);
      } catch (err) {
        optimisticFailures[tempId] = optimistic;
        $('msgSendBtn').disabled = false;
        const row = document.querySelector(`[data-message="${tempId}"] .msg-bubble__status`);
        if (row) row.outerHTML = statusTickHtml(Object.assign({}, optimistic, { status: 'failed' }));
        wireThreadEvents(conv);
        window.PlayShell.toast('error', "Couldn't send", 'Your message was not sent. Tap retry to try again.');
      }
    }, 350);
  }
  const optimisticFailures = {};
  function appendOptimistic(conv, optimistic) {
    const thread = $('msgThread');
    const today = todayISO();
    const needsDateSep = !thread.querySelector('.msg-date-sep:last-of-type') || !thread.innerHTML.includes(formatDay(optimistic.createdAt));
    if (thread.querySelector('.msg-thread-empty')) thread.innerHTML = '';
    if (needsDateSep && !thread.innerHTML.includes('>' + formatDay(optimistic.createdAt) + '<')) thread.insertAdjacentHTML('beforeend', `<div class="msg-date-sep"><span>${formatDay(optimistic.createdAt)}</span></div>`);
    thread.insertAdjacentHTML('beforeend', messageBubbleHtml(optimistic, currentStaff()));
    wireThreadEvents(conv);
    scrollChatToBottom();
  }
  function retrySend(tempOrRealId, conv) {
    const pending = optimisticFailures[tempOrRealId];
    if (!pending) return;
    delete optimisticFailures[tempOrRealId];
    const staff = currentStaff();
    try {
      const recipientGuardianIds = conv.kind === 'family' ? guardiansFor(conv).map((g) => g.id) : [];
      const saved = window.PlayStore.addRecord({
        id: uid('MSG'), type: 'Message', conversationId: conv.id, subject: '', body: pending.body,
        recipientGuardianIds, date: todayISO(), createdAt: pending.createdAt,
        senderType: 'Staff', senderId: staff.id, senderName: staff.name, status: 'sent',
        attachments: pending.attachments || [], readBy: [staff.id],
      });
      window.PlayStore.updateRecord(conv.id, { lastMessageAt: saved.createdAt });
      renderThread(conv);
      renderConversationList();
      window.PlayShell.toast('success', 'Message sent', '');
      maybeTriggerDemoReply(conv);
    } catch (err) {
      optimisticFailures[tempOrRealId] = pending;
      window.PlayShell.toast('error', "Couldn't send", 'Still unable to send this message.');
    }
  }

  /* ---------- demo-only simulated reply ---------- */
  const DEMO_REPLIES = {
    family: ["Thank you, we'll keep an eye on it.", 'Got it — appreciate you letting us know!', 'Sounds good, thank you!'],
    staff: ['Sounds good, thanks!', 'On it.', 'Noted, thank you.'],
  };
  function maybeTriggerDemoReply(conv) {
    if (!DEMO_MODE || conv.kind === 'group') return;
    const convId = conv.id;
    window.setTimeout(() => {
      const freshConv = window.PlayStore.getById(convId);
      if (!freshConv) return;
      const staff = currentStaff();
      const pool = DEMO_REPLIES[conv.kind] || DEMO_REPLIES.family;
      const replyText = pool[Math.floor(Math.random() * pool.length)];
      let senderId, senderName;
      if (conv.kind === 'family') { const g = guardiansFor(conv)[0]; senderId = g ? g.id : 'guardian'; senderName = g ? g.name : 'Guardian'; }
      else { const s = staffFor(conv); senderId = s ? s.id : 'staff'; senderName = s ? s.name : 'Staff'; }
      messagesFor(convId).filter((m) => m.senderId === staff.id && (m.readBy || []).indexOf(senderId) === -1).forEach((m) => window.PlayStore.updateRecord(m.id, { readBy: (m.readBy || []).concat(senderId) }));
      const reply = window.PlayStore.addRecord({
        id: uid('MSG'), type: 'Message', conversationId: convId, subject: '', body: replyText,
        recipientGuardianIds: [], date: todayISO(), createdAt: new Date().toISOString(),
        senderType: conv.kind === 'family' ? 'Guardian' : 'Staff', senderId, senderName, status: 'sent', attachments: [], readBy: [senderId],
      });
      window.PlayStore.updateRecord(convId, { lastMessageAt: reply.createdAt });
      window.PlayShell.addNotification({ title: `New message from ${senderName}`, text: replyText, forRole: role || 'Director', module: 'communication', mention: true, recordRoute: `messages.html?conversationId=${convId}` });
      if (activeConversationId === convId && document.visibilityState === 'visible') {
        markConversationRead(convId);
        render();
      } else {
        render();
        window.PlayShell.toast('info', `New message from ${senderName}`, replyText);
      }
    }, 3000);
  }

  /* ---------- context toggle / mobile back ---------- */
  function wireContextToggle() {
    $('msgContextToggle').addEventListener('click', () => { contextPanelOpen = !contextPanelOpen; render(); });
    $('msgContextSheetBackdrop').addEventListener('click', (e) => { if (e.target === $('msgContextSheetBackdrop')) closeContextSheet(); });
  }
  function openContextSheet() { $('msgContextSheetBody').innerHTML = $('msgContextPanel').innerHTML; $('msgContextSheetBackdrop').classList.add('is-open'); document.body.style.overflow = 'hidden'; }
  function closeContextSheet() { $('msgContextSheetBackdrop').classList.remove('is-open'); document.body.style.overflow = ''; }
  function wireConversationHeader() {
    $('msgNewConvoBtn').addEventListener('click', () => openNewMessageModal());
    $('msgSearch').addEventListener('input', () => { searchQuery = $('msgSearch').value; renderConversationList(); });
    $('msgInfoBtn').addEventListener('click', openContextSheet);
  }
  function wireMobileBack() { $('msgBackBtn').addEventListener('click', () => { mobileView = 'list'; render(); }); }

  /* ========================================================================
     RIGHT PANE — CONTEXT PANEL
     ======================================================================== */
  function renderContextPanel() {
    const conv = activeConversationId && window.PlayStore.getById(activeConversationId);
    const panel = $('msgContextPanel');
    if (!conv) { panel.innerHTML = `<p class="ws-section-empty">Select a conversation to see details.</p>`; return; }
    if (conv.kind === 'family') panel.innerHTML = familyContextHtml(conv);
    else if (conv.kind === 'staff') panel.innerHTML = staffContextHtml(conv);
    else panel.innerHTML = groupContextHtml(conv);
  }
  function alertCardHtml(a) {
    const META = { allergy: 'Allergy', medical: 'Medical', dietary: 'Dietary', custody: 'Custody' };
    const urgent = a.type !== 'dietary';
    return `<div class="msg-alert-card ${urgent ? 'is-urgent' : ''}">${ICON.alert}<div><div class="msg-alert-card__label">${META[a.type] || a.type}</div><div class="msg-alert-card__text">${escapeHtml(a.detail || '')}</div></div></div>`;
  }
  function familyContextHtml(conv) {
    const child = childFor(conv);
    const guardians = guardiansFor(conv);
    const canSeeCustody = hasRole(RESTRICTED_ROLES);
    let alerts = child ? (child.alerts || []) : [];
    if (!canSeeCustody) alerts = alerts.filter((a) => a.type !== 'custody');
    return `
      <div class="msg-context-child">
        <span class="avatar avatar--lg">${escapeHtml(initials(child ? child.name : 'Child'))}</span>
        <div><div class="msg-context-child__name">${escapeHtml(child ? child.name : 'Unknown child')}</div><div class="msg-context-child__class">${escapeHtml(child ? (child.room || '') : '')}</div></div>
      </div>
      <div class="ws-drawer-section">
        <h4 class="ws-drawer-section__title">Alerts</h4>
        ${alerts.length ? alerts.map(alertCardHtml).join('') : `<div class="ws-alert-empty">${ICON.check} No active alerts on file.</div>`}
      </div>
      <div class="ws-drawer-section">
        <h4 class="ws-drawer-section__title">Guardians</h4>
        ${guardians.map((g) => `<div class="msg-context-guardian"><span class="avatar avatar--sm">${escapeHtml(initials(g.name))}</span><div><div class="msg-context-guardian__name">${escapeHtml(g.name)}</div><div class="msg-context-guardian__lang">${escapeHtml(g.preferredLanguage || 'English')}</div></div></div>`).join('') || `<p class="ws-section-empty">No guardians on file.</p>`}
      </div>
      ${child ? `<a class="btn btn--secondary" style="width:100%; justify-content:center; margin-top: var(--space-2);" href="record.html?id=${encodeURIComponent(child.id)}">Open full profile</a>` : ''}`;
  }
  function staffContextHtml(conv) {
    const s = staffFor(conv);
    if (!s) return `<p class="ws-section-empty">Staff member not found.</p>`;
    return `
      <div class="msg-context-child">
        <span class="avatar avatar--lg">${escapeHtml(initials(s.name))}</span>
        <div><div class="msg-context-child__name">${escapeHtml(s.name)}</div><div class="msg-context-child__class">${escapeHtml(s.relation || 'Staff')}</div></div>
      </div>
      <div class="ws-drawer-section"><h4 class="ws-drawer-section__title">Status</h4><span class="badge ${s.status === 'Active' ? 'badge--success' : 'badge--neutral'}">${escapeHtml(s.status || 'Unknown')}</span></div>`;
  }
  function groupContextHtml(conv) {
    const c = classFor(conv);
    if (!c) return `<p class="ws-section-empty">Class not found.</p>`;
    const children = window.PlayStore.getByType('Child').filter((ch) => ch.room === c.name && ch.status === 'Active');
    return `
      <div class="msg-context-child">
        <span class="avatar avatar--lg" style="background: var(--color-brand-blue);">${escapeHtml(initials(c.name))}</span>
        <div><div class="msg-context-child__name">${escapeHtml(c.name)}</div><div class="msg-context-child__class">${escapeHtml(ageRangeLabel(c))}</div></div>
      </div>
      <div class="ws-drawer-section"><h4 class="ws-drawer-section__title">Class</h4>
        <div class="table-card__row"><span class="table-card__label">Room</span><span class="table-card__value">${escapeHtml(c.room || '—')}</span></div>
        <div class="table-card__row"><span class="table-card__label">Enrolled</span><span class="table-card__value">${children.length} / ${c.capacity || '—'}</span></div>
      </div>
      <a class="btn btn--secondary" style="width:100%; justify-content:center; margin-top: var(--space-2);" href="class-workspace.html?id=${encodeURIComponent(c.id)}">Open class workspace</a>`;
  }

  /* ========================================================================
     NEW MESSAGE MODAL
     ======================================================================== */
  function openModal(id) { const b = $(id); b.classList.add('is-open'); b.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
  function closeModal(id) { const b = $(id); b.classList.remove('is-open'); b.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  function openNewMessageModal() {
    newMsgStep = 1; newMsgType = null; newMsgRecipientId = null;
    renderNewMessageStep();
    openModal('newMsgModalBackdrop');
  }
  function renderNewMessageStep() {
    $('newMsgStepIndicator').textContent = `Step ${newMsgStep} of 3`;
    if (newMsgStep === 1) {
      $('newMsgBody').innerHTML = `
        <div class="msg-type-grid">
          <button type="button" class="msg-type-card" data-new-type="family">${ICON.users}<span>Family</span></button>
          <button type="button" class="msg-type-card" data-new-type="staff">${ICON.users}<span>Staff member</span></button>
          <button type="button" class="msg-type-card" data-new-type="group">${ICON.users}<span>Class group</span></button>
        </div>`;
      $('newMsgBody').querySelectorAll('[data-new-type]').forEach((btn) => btn.addEventListener('click', () => { newMsgType = btn.dataset.newType; newMsgStep = 2; renderNewMessageStep(); }));
      $('newMsgBack').hidden = true; $('newMsgNext').hidden = true;
    } else if (newMsgStep === 2) {
      let options = [];
      if (newMsgType === 'family') options = window.PlayStore.getByType('Family').map((f) => ({ id: f.id, label: f.name, sub: (window.PlayStore.getById((f.childIds || [])[0]) || {}).name || '' }));
      else if (newMsgType === 'staff') options = window.PlayStore.getByType('Staff').filter((s) => s.id !== currentStaff().id).map((s) => ({ id: s.id, label: s.name, sub: s.relation || '' }));
      else options = window.PlayStore.getByType('Class').filter((c) => c.status !== 'Archived').map((c) => ({ id: c.id, label: c.name, sub: ageRangeLabel(c) }));
      $('newMsgBody').innerHTML = `
        <div class="input-wrap"><span class="input-wrap__icon">${ICON.search}</span><input class="input" id="newMsgRecipientSearch" type="text" placeholder="Search…" /></div>
        <div class="pl-picker-results cls-picker-results" id="newMsgRecipientList" style="margin-top:var(--space-3); max-height:260px;"></div>`;
      const renderList = (q) => {
        const filtered = options.filter((o) => !q || (o.label + ' ' + o.sub).toLowerCase().includes(q.toLowerCase()));
        $('newMsgRecipientList').innerHTML = filtered.length ? filtered.map((o) => `<div class="cls-picker-row" data-pick="${o.id}"><span class="avatar avatar--sm">${escapeHtml(initials(o.label))}</span><span>${escapeHtml(o.label)}</span><span class="cls-picker-row__sub">${escapeHtml(o.sub)}</span></div>`).join('') : `<p class="ws-section-empty">No matches.</p>`;
        $('newMsgRecipientList').querySelectorAll('[data-pick]').forEach((row) => row.addEventListener('click', () => { newMsgRecipientId = row.dataset.pick; newMsgStep = 3; renderNewMessageStep(); }));
      };
      renderList('');
      $('newMsgRecipientSearch').addEventListener('input', (e) => renderList(e.target.value));
      $('newMsgBack').hidden = false; $('newMsgNext').hidden = true;
    } else {
      $('newMsgBody').innerHTML = `
        <div class="field"><label class="field__label" for="newMsgComposeText">Message</label><textarea class="textarea" id="newMsgComposeText" rows="4" placeholder="Write your message…"></textarea><p class="field__error" id="err-newMsgComposeText" hidden></p></div>`;
      $('newMsgBack').hidden = false; $('newMsgNext').hidden = false; $('newMsgNext').textContent = 'Send';
    }
  }
  function wireNewMessageModal() {
    const backdrop = $('newMsgModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('newMsgModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('newMsgModalBackdrop'); });
    $('newMsgBack').addEventListener('click', () => { newMsgStep = Math.max(1, newMsgStep - 1); renderNewMessageStep(); });
    $('newMsgNext').addEventListener('click', () => {
      if (newMsgStep !== 3) return;
      const text = $('newMsgComposeText').value.trim();
      if (!text) { document.getElementById('err-newMsgComposeText').hidden = false; document.getElementById('err-newMsgComposeText').textContent = 'Write a message before sending.'; return; }
      const conv = findOrCreateConversation(newMsgType, newMsgRecipientId);
      const staff = currentStaff();
      const recipientGuardianIds = conv.kind === 'family' ? guardiansFor(conv).map((g) => g.id) : [];
      const saved = window.PlayStore.addRecord({ id: uid('MSG'), type: 'Message', conversationId: conv.id, subject: '', body: text, recipientGuardianIds, date: todayISO(), createdAt: new Date().toISOString(), senderType: 'Staff', senderId: staff.id, senderName: staff.name, status: 'sent', attachments: [], readBy: [staff.id] });
      window.PlayStore.updateRecord(conv.id, { lastMessageAt: saved.createdAt });
      closeModal('newMsgModalBackdrop');
      openConversation(conv.id);
      window.PlayShell.toast('success', 'Message sent', '');
      maybeTriggerDemoReply(conv);
    });
  }
  function findOrCreateConversation(type, recipientId) {
    const existing = allConversations().find((c) => (type === 'family' && c.kind === 'family' && c.familyId === recipientId) || (type === 'staff' && c.kind === 'staff' && c.staffId === recipientId) || (type === 'group' && c.kind === 'group' && c.classId === recipientId));
    if (existing) return existing;
    const now = new Date().toISOString();
    if (type === 'family') {
      const family = window.PlayStore.getById(recipientId);
      const child = window.PlayStore.getById((family.childIds || [])[0]);
      return window.PlayStore.addRecord({ id: uid('CONV'), type: 'Conversation', kind: 'family', familyId: recipientId, childId: child ? child.id : null, createdAt: now, lastMessageAt: now });
    }
    if (type === 'staff') return window.PlayStore.addRecord({ id: uid('CONV'), type: 'Conversation', kind: 'staff', staffId: recipientId, createdAt: now, lastMessageAt: now });
    return window.PlayStore.addRecord({ id: uid('CONV'), type: 'Conversation', kind: 'group', classId: recipientId, createdAt: now, lastMessageAt: now });
  }

  /* ========================================================================
     SCHEDULE MODAL
     ======================================================================== */
  function openScheduleModal() {
    const conv = activeConversationId && window.PlayStore.getById(activeConversationId);
    if (!conv) return;
    scheduleTargetDraft = { convId: conv.id, text: $('msgComposerText').value.trim(), attachment: pendingAttachment };
    if (!scheduleTargetDraft.text && !scheduleTargetDraft.attachment) { window.PlayShell.toast('error', 'Write a message first', 'Type a message before scheduling it.'); return; }
    $('schedDate').value = todayISO();
    $('schedTime').value = '';
    document.getElementById('err-schedTime').hidden = true;
    openModal('scheduleModalBackdrop');
  }
  function wireScheduleModal() {
    const backdrop = $('scheduleModalBackdrop');
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop || e.target.closest('[data-close]')) closeModal('scheduleModalBackdrop'); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && backdrop.classList.contains('is-open')) closeModal('scheduleModalBackdrop'); });
    $('schedCancel').addEventListener('click', () => closeModal('scheduleModalBackdrop'));
    $('schedConfirm').addEventListener('click', () => {
      const date = $('schedDate').value; const time = $('schedTime').value;
      if (!date || !time) { document.getElementById('err-schedTime').hidden = false; document.getElementById('err-schedTime').textContent = 'Choose a date and time.'; return; }
      const when = new Date(date + 'T' + time + ':00');
      if (when.getTime() <= Date.now()) { document.getElementById('err-schedTime').hidden = false; document.getElementById('err-schedTime').textContent = 'Choose a time in the future.'; return; }
      const staff = currentStaff();
      const conv = window.PlayStore.getById(scheduleTargetDraft.convId);
      const recipientGuardianIds = conv.kind === 'family' ? guardiansFor(conv).map((g) => g.id) : [];
      window.PlayStore.addRecord({
        id: uid('MSG'), type: 'Message', conversationId: conv.id, subject: '', body: scheduleTargetDraft.text,
        recipientGuardianIds, date: date, createdAt: new Date().toISOString(), scheduledFor: when.toISOString(),
        senderType: 'Staff', senderId: staff.id, senderName: staff.name, status: 'scheduled', attachments: scheduleTargetDraft.attachment ? [scheduleTargetDraft.attachment] : [], readBy: [staff.id],
      });
      $('msgComposerText').value = ''; delete drafts[conv.id]; pendingAttachment = null;
      closeModal('scheduleModalBackdrop');
      render();
      window.PlayShell.toast('success', 'Message scheduled', `Will send ${when.toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.`);
    });
  }
})();
