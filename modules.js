/* ==========================================================================
   PLAY SCHOOL — module catalogue + subscription plan state
   Single source of truth for the 10 application modules (what they do, what
   plan they require) and for the school's current plan. No backend in this
   static project — plan state is a localStorage flag, same pattern as the
   auth/notifications flags in shell.js.
   ========================================================================== */
(function () {
  'use strict';

  const PLAN_KEY = 'ps_plan';
  const PLAN_ORDER = ['Starter', 'Standard', 'Premium'];
  const DEFAULT_PLAN = 'Starter';

  function getCurrentPlan() {
    try {
      const plan = localStorage.getItem(PLAN_KEY);
      return PLAN_ORDER.indexOf(plan) === -1 ? DEFAULT_PLAN : plan;
    } catch (e) { return DEFAULT_PLAN; }
  }
  function setCurrentPlan(plan) {
    if (PLAN_ORDER.indexOf(plan) === -1) return;
    try { localStorage.setItem(PLAN_KEY, plan); } catch (e) { /* storage unavailable */ }
  }
  function planIndex(plan) { return PLAN_ORDER.indexOf(plan); }
  function isUnlocked(module, plan) {
    return planIndex(plan || getCurrentPlan()) >= planIndex(module.requiredPlan);
  }

  const ICONS = {
    attendance: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="m9 15 2 2 4-4"/></svg>',
    'health-safety': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 19 6v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6Z"/><path d="M12 8.5v5M9.5 11h5"/></svg>',
    communication: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z"/></svg>',
    curriculum: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6c-2-1.5-5-2-8-1v13c3-1 6-.5 8 1 2-1.5 5-2 8-1V5c-3-1-6-.5-8 1Z"/><path d="M12 6v13"/></svg>',
    reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/></svg>',
  };

  const LOCK_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';

  /* `core` modules already have a dedicated, fully-built page and are part of
     every plan — they exist in the catalogue so the sidebar and the plan
     comparison page can describe "what's included" consistently. */
  const MODULES = [
    { id: 'dashboard', navLabel: 'Dashboard', href: 'dashboard.html', requiredPlan: 'Starter', core: true },
    { id: 'classrooms', navLabel: 'Classrooms', href: 'dashboard.html#classrooms', requiredPlan: 'Starter', core: true },
    { id: 'children', navLabel: 'Children', href: 'children.html', requiredPlan: 'Starter', core: true },
    { id: 'staff', navLabel: 'Staff', href: 'dashboard.html#staff', requiredPlan: 'Starter', core: true },
    { id: 'billing', navLabel: 'Billing', href: 'payroll.html', requiredPlan: 'Starter', core: true },
    { id: 'calendar', navLabel: 'Calendar', href: 'calendar.html', requiredPlan: 'Starter', core: true },
    { id: 'care-log', navLabel: 'Daily Care Log', href: 'care-log.html', requiredPlan: 'Starter', core: true },
    {
      id: 'attendance',
      navLabel: 'Attendance & Check-in',
      href: 'attendance.html',
      requiredPlan: 'Standard',
      name: 'Attendance & Check-in',
      icon: ICONS.attendance,
      description: 'Record daily arrivals and departures, flag late pickups, and keep an accurate attendance history for every room.',
      features: [
        { title: 'Digital check-in & check-out', text: 'Guardians and staff sign children in and out from a shared kiosk or tablet.' },
        { title: 'Automated late-pickup alerts', text: 'Notify the front desk the moment a pickup runs past the cut-off time.' },
        { title: 'Daily attendance registers', text: 'Generate room-by-room registers that are ready for inspection or audit.' },
        { title: 'Absence tracking & trends', text: 'Spot patterns in absence before they become a wellbeing concern.' },
        { title: 'Guardian pickup authorisation', text: "Confirm who is approved to collect each child before they're released." },
      ],
    },
    {
      id: 'health-safety',
      navLabel: 'Health, Safety & Safeguarding',
      href: 'module.html?id=health-safety',
      requiredPlan: 'Premium',
      name: 'Health, Safety & Safeguarding',
      icon: ICONS['health-safety'],
      description: 'Give your team the tools to manage safeguarding responsibilities, maintain essential records, and support a safer environment for every child.',
      features: [
        { title: 'Incident & accident logging', text: 'Record, timestamp and follow up on every incident with a clear audit trail.' },
        { title: 'Safeguarding case records', text: 'Keep confidential, access-controlled notes on sensitive concerns.' },
        { title: 'DBS & certification tracking', text: 'Get alerted before staff checks, first-aid or training certificates lapse.' },
        { title: 'Allergy & medical alerts', text: "Surface a child's allergies and medical needs to every relevant staff member." },
        { title: 'Safeguarding policy sign-off', text: 'Track which staff have read and acknowledged the latest safeguarding policy.' },
      ],
    },
    {
      id: 'communication',
      navLabel: 'Parent Communication Hub',
      href: 'module.html?id=communication',
      requiredPlan: 'Premium',
      name: 'Parent Communication Hub',
      icon: ICONS.communication,
      description: 'Keep every family informed with announcements, direct messaging and shareable daily updates.',
      features: [
        { title: 'Broadcast announcements', text: 'Send term updates or closures to every guardian in one message.' },
        { title: 'Direct messaging with staff', text: "Let guardians message a child's room lead securely, in one thread." },
        { title: 'Daily activity updates', text: 'Share photos, naps and meals for each child at the end of the day.' },
        { title: 'Read receipts & reminders', text: "See who has seen a message and nudge the ones who haven't." },
        { title: 'Translated announcements', text: 'Reach multilingual families with auto-translated messages.' },
      ],
    },
    {
      id: 'curriculum',
      navLabel: 'Curriculum & Lesson Planning',
      href: 'module.html?id=curriculum',
      requiredPlan: 'Premium',
      name: 'Curriculum & Lesson Planning',
      icon: ICONS.curriculum,
      description: 'Plan Montessori-aligned activities, track developmental milestones and share progress with families.',
      features: [
        { title: 'Montessori activity library', text: 'Build lesson plans from a ready-made bank of Montessori activities.' },
        { title: 'Developmental milestone tracking', text: "Record each child's progress against age-appropriate milestones." },
        { title: 'Weekly lesson planner', text: "Plan and share each room's weekly curriculum in a shared calendar." },
        { title: 'Observation notes', text: "Capture quick observations during the day and link them to a child's record." },
        { title: 'Progress reports for families', text: 'Generate shareable progress reports each term.' },
      ],
    },
    {
      id: 'reports',
      navLabel: 'Reports & Analytics',
      href: 'module.html?id=reports',
      requiredPlan: 'Standard',
      name: 'Reports & Analytics',
      icon: ICONS.reports,
      description: 'Turn enrolment, attendance and billing data into clear reports for your leadership team.',
      features: [
        { title: 'Enrolment & occupancy reports', text: 'See room capacity and waitlist trends at a glance.' },
        { title: 'Attendance analytics', text: 'Track attendance rates by room, term or child.' },
        { title: 'Revenue & billing summaries', text: 'Review fees collected, outstanding balances and forecasts.' },
        { title: 'Staff-to-child ratio reports', text: 'Confirm ratio compliance across every room, every day.' },
        { title: 'Custom exportable reports', text: 'Export any report to CSV for board meetings or inspections.' },
      ],
    },
  ];

  function getById(id) {
    return MODULES.find((m) => m.id === id) || null;
  }
  function modulesForPlan(plan) {
    return MODULES.filter((m) => planIndex(plan) >= planIndex(m.requiredPlan));
  }

  window.PlayModules = {
    PLAN_KEY,
    PLAN_ORDER,
    MODULES,
    LOCK_ICON,
    getById,
    modulesForPlan,
    getCurrentPlan,
    setCurrentPlan,
    planIndex,
    isUnlocked,
  };
})();
