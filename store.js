/* ==========================================================================
   PLAY SCHOOL — shared data store
   Minimal in-memory dataset + search used across app pages (dashboard,
   record pages, 404 global search). No backend — static demo data only.
   ========================================================================== */
(function () {
  'use strict';

  /* A single shared demo signature image (S31 Family Forms) — represents an
     already-captured signature in seed/historical data only. Real signatures
     collected through the Forms builder are drawn live on a canvas and
     stored as their own data URL; nothing here is presented as a live
     parent signature. */
  const DEMO_SIGNATURE_DATA_URL = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 80"><path d="M10 58 C28 12,48 70,68 28 S108 10,128 48 S168 68,200 22" stroke="#1d2340" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M58 52 C72 34,84 58,98 42" stroke="#1d2340" stroke-width="2.4" fill="none" stroke-linecap="round"/></svg>');

  /* Relative seed dates (S32 Parent–Teacher Conferences) — computed from the
     real current date so the demo availability grid always shows a sensible
     "this week" of slots regardless of when the app is opened. */
  function confPad2(n) { return String(n).padStart(2, '0'); }
  function confIsoPlusDays(n) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + confPad2(d.getMonth() + 1) + '-' + confPad2(d.getDate());
  }
  const CONF_PAST = confIsoPlusDays(-5);
  const CONF_D1 = confIsoPlusDays(1);
  const CONF_D2 = confIsoPlusDays(2);
  const CONF_D3 = confIsoPlusDays(3);

  const records = [
    {
      id: 'C-1001', type: 'Child', name: 'Amara Osei', preferredName: 'Ami', room: 'Sunflower Room', status: 'Active', guardianId: 'G-2001',
      dob: '2023-06-10', startDate: '2025-09-02',
      alerts: [{ id: 'AL-10011', type: 'allergy', detail: 'Severe peanut allergy — EpiPen in office', allergen: 'peanuts' }],
      authorizedPickups: [
        { id: 'PU-10011', name: 'Folasade Osei', relation: 'Mother', restricted: false, passcode: '4821' },
        { id: 'PU-10012', name: 'Kwame Osei', relation: 'Father', restricted: false, passcode: null },
      ],
    },
    {
      id: 'C-1002', type: 'Child', name: 'Rhea Kapoor', room: 'Marigold Room', status: 'Active', guardianId: 'G-2002',
      dob: '2024-02-10', startDate: '2026-02-10',
      alerts: [{ id: 'AL-10021', type: 'dietary', detail: 'Vegetarian diet only — no meat or fish' }],
      authorizedPickups: [
        { id: 'PU-10021', name: 'Nikhil Kapoor', relation: 'Father', restricted: false, passcode: null },
      ],
    },
    {
      id: 'C-1003', type: 'Child', name: 'Leo Fernandes', room: 'Daisy Room', status: 'Starting soon', guardianId: 'G-2003',
      dob: '2024-12-10', startDate: '2026-11-03',
      alerts: [],
      authorizedPickups: [
        { id: 'PU-10031', name: 'Priya Fernandes', relation: 'Mother', restricted: false, passcode: null },
      ],
    },
    {
      id: 'C-1004', type: 'Child', name: 'Noor Haddad', room: 'Sunflower Room', status: 'Withdrawn', guardianId: 'G-2004',
      dob: '2022-08-15', startDate: '2024-09-01', withdrawnDate: '2026-01-14', withdrawnReason: 'Family relocated out of the district.',
      alerts: [{ id: 'AL-10041', type: 'medical', detail: 'Asthma — rescue inhaler kept in classroom cabinet' }],
      authorizedPickups: [
        { id: 'PU-10041', name: 'Sara Haddad', relation: 'Mother', restricted: false, passcode: null },
      ],
    },
    {
      id: 'C-1005', type: 'Child', name: 'Ananya Raj', preferredName: 'Ana', room: 'Marigold Room', status: 'Active', guardianId: 'G-2005',
      dob: '2022-11-10', startDate: '2025-01-13',
      alerts: [{ id: 'AL-10051', type: 'custody', detail: 'Only Aanya Kumar and the listed grandparents may collect Ananya — see custody order on file' }],
      authorizedPickups: [
        { id: 'PU-10051', name: 'Aanya Kumar', relation: 'Mother', restricted: false, passcode: '7730' },
        { id: 'PU-10052', name: 'Meena Kumar', relation: 'Grandmother', restricted: false, passcode: null },
        { id: 'PU-10053', name: 'Rohan Raj', relation: 'Father', restricted: true, restrictionReason: 'Custody order on file — do not release.' },
      ],
    },
    {
      id: 'C-1006', type: 'Child', name: 'Kabir Siddiqui', room: 'Daisy Room', status: 'Graduated', guardianId: 'G-2006',
      dob: '2020-09-02', startDate: '2022-09-01',
      alerts: [],
      authorizedPickups: [
        { id: 'PU-10061', name: 'Imran Siddiqui', relation: 'Father', restricted: false, passcode: null },
      ],
    },

    { id: 'G-2001', type: 'Guardian', name: 'Folasade Osei', relation: 'Parent of Amara Osei', status: 'Active', contact: 'folasade.osei@example.com' },
    { id: 'G-2002', type: 'Guardian', name: 'Nikhil Kapoor', relation: 'Parent of Rhea Kapoor', status: 'Active', contact: 'nikhil.kapoor@example.com' },
    { id: 'G-2003', type: 'Guardian', name: 'Priya Fernandes', relation: 'Parent of Leo Fernandes', status: 'Active', contact: 'priya.fernandes@example.com' },
    { id: 'G-2004', type: 'Guardian', name: 'Sara Haddad', relation: 'Parent of Noor Haddad', status: 'Active', contact: 'sara.haddad@example.com' },
    { id: 'G-2005', type: 'Guardian', name: 'Aanya Kumar', relation: 'Parent of Ananya Raj', status: 'Active', contact: 'aanya.kumar@example.com' },
    { id: 'G-2006', type: 'Guardian', name: 'Imran Siddiqui', relation: 'Parent of Kabir Siddiqui', status: 'Active', contact: 'imran.siddiqui@example.com' },

    { id: 'S-3001', type: 'Staff', name: 'Nithya', relation: 'Admin', status: 'Active' },
    { id: 'S-3002', type: 'Staff', name: 'Rhea Kapoor', relation: 'Teacher · Marigold Room', status: 'Active', classNames: ['Marigold Room'] },
    { id: 'S-3003', type: 'Staff', name: 'Meera Fernandes', relation: 'Teacher · Sunflower Room', status: 'Active', classNames: ['Sunflower Room'] },
    { id: 'S-3004', type: 'Staff', name: 'Divya Shah', relation: 'Staff · Sunflower Room', status: 'Active', classNames: ['Sunflower Room'] },
    { id: 'S-3005', type: 'Staff', name: 'Arjun Mehta', relation: 'Teacher · Daisy Room', status: 'Active', classNames: ['Daisy Room'] },
    { id: 'S-3006', type: 'Staff', name: 'Kavya Iyer', relation: 'Staff · Marigold Room', status: 'Active', classNames: ['Marigold Room'] },
    { id: 'S-3007', type: 'Staff', name: 'Ron Dsouza', relation: 'Staff · Daisy Room', status: 'Active', classNames: ['Daisy Room'] },

    /* Classes (S20) — `room` is the physical room/location label shown on the
       class card; the class's own `name` (e.g. "Sunflower Room") remains the
       identifier every child's `child.room` field is matched against
       (children.js, enroll.js, attendance.js, families.js, dashboard.js all
       key off this convention) — renaming a class migrates that field, see
       classes.js's save handler. `ratioLimit` is a per-class override of the
       school-wide `classRatioLimit` setting (children allowed per adult). */
    { id: 'CLS-9001', type: 'Class', name: 'Sunflower Room', ageGroup: 'Toddler · 18mo–3y', room: 'Ground Floor · Room 1', color: 'blue', minAgeMonths: 18, maxAgeMonths: 36, mixedAge: false, teacherName: 'Meera Fernandes', teacherId: 'S-3003', status: 'Active', startTime: '08:00', capacity: 14, ratioLimit: 4 },
    { id: 'CLS-9002', type: 'Class', name: 'Marigold Room', ageGroup: 'Primary · 3–6y', room: 'Ground Floor · Room 2', color: 'violet', minAgeMonths: 36, maxAgeMonths: 72, mixedAge: false, teacherName: 'Rhea Kapoor', teacherId: 'S-3002', status: 'Active', startTime: '08:15', capacity: 16, ratioLimit: 10 },
    { id: 'CLS-9003', type: 'Class', name: 'Daisy Room', ageGroup: 'Lower Elementary · 6–9y', room: 'First Floor · Room 1', color: 'amber', minAgeMonths: 72, maxAgeMonths: 108, mixedAge: false, teacherName: 'Arjun Mehta', teacherId: 'S-3005', status: 'Active', startTime: '08:30', capacity: 15, ratioLimit: 14 },

    /* ---------- sample payments + incident ----------
       Payment records are matched to a child by name (the existing
       convention — see dashboard.js's "Record payment" quick action, which
       has no childId field to reuse). Incident records gain an optional
       childId so the Child Profile's Incidents tab can show real matches;
       existing/new general incidents simply omit it. */
    { id: 'PAY-9001', type: 'Payment', childName: 'Amara Osei', amount: 450, status: 'Paid', date: '2026-09-01' },
    { id: 'PAY-9002', type: 'Payment', childName: 'Amara Osei', amount: 450, status: 'Pending', date: '2026-10-01' },
    { id: 'INC-9001', type: 'Incident', childId: 'C-1001', description: 'Minor scrape on knee during outdoor play — cleaned and bandaged.', severity: 'Low', status: 'Closed', date: '2026-09-20' },

    /* ---------- weekly menu template ----------
       One record per weekday (0=Sunday … 6=Saturday), each item tagged with
       the allergens it contains so the Daily Care Log can cross-check them
       against a child's recorded allergies. Resolved for a given date via
       PlayStore.getMenuForDate() below — not a per-date record, so it never
       goes stale. */
    {
      id: 'MENU-1', type: 'MenuTemplate', dayOfWeek: 1,
      meals: {
        Breakfast: [{ name: 'Oatmeal with banana', allergens: [] }, { name: 'Milk', allergens: ['dairy'] }],
        Snack: [{ name: 'Apple slices with peanut butter', allergens: ['peanuts'] }],
        Lunch: [{ name: 'Grilled cheese sandwich', allergens: ['dairy', 'gluten'] }, { name: 'Tomato soup', allergens: [] }, { name: 'Orange wedges', allergens: [] }],
      },
    },
    {
      id: 'MENU-2', type: 'MenuTemplate', dayOfWeek: 2,
      meals: {
        Breakfast: [{ name: 'Scrambled eggs', allergens: ['eggs'] }, { name: 'Toast', allergens: ['gluten'] }],
        Snack: [{ name: 'Yogurt with berries', allergens: ['dairy'] }],
        Lunch: [{ name: 'Chicken pasta', allergens: ['gluten'] }, { name: 'Garden salad', allergens: [] }, { name: 'Watermelon', allergens: [] }],
      },
    },
    {
      id: 'MENU-3', type: 'MenuTemplate', dayOfWeek: 3,
      meals: {
        Breakfast: [{ name: 'Pancakes', allergens: ['gluten', 'eggs', 'dairy'] }],
        Snack: [{ name: 'Hummus with carrot sticks', allergens: [] }],
        Lunch: [{ name: 'Veggie wrap', allergens: ['gluten'] }, { name: 'Lentil soup', allergens: [] }, { name: 'Banana', allergens: [] }],
      },
    },
    {
      id: 'MENU-4', type: 'MenuTemplate', dayOfWeek: 4,
      meals: {
        Breakfast: [{ name: 'Cereal with milk', allergens: ['gluten', 'dairy'] }],
        Snack: [{ name: 'Peanut butter crackers', allergens: ['peanuts', 'gluten'] }],
        Lunch: [{ name: 'Fish fingers', allergens: ['fish', 'gluten'] }, { name: 'Mixed vegetables', allergens: [] }, { name: 'Pear slices', allergens: [] }],
      },
    },
    {
      id: 'MENU-5', type: 'MenuTemplate', dayOfWeek: 5,
      meals: {
        Breakfast: [{ name: 'Fruit yogurt parfait', allergens: ['dairy'] }],
        Snack: [{ name: 'Cheese cubes', allergens: ['dairy'] }],
        Lunch: [{ name: 'Rice and dal', allergens: [] }, { name: 'Cucumber salad', allergens: [] }, { name: 'Apple', allergens: [] }],
      },
    },

    /* ---------- calendar events ----------
       `recurrence.freq` is 'none' | 'weekly' | 'monthly'; occurrences are computed
       on the fly from this one master record (see calendar.js expandEvent()) —
       `exceptions` holds per-occurrence overrides/cancellations keyed by the
       original occurrence date, so editing/deleting a single instance never
       duplicates or rewrites the whole series. */
    {
      id: 'EVT-9001', type: 'Event', seriesId: 'EVT-9001', title: 'Weekly staff meeting', eventType: 'meeting',
      allDay: false, startDate: '2026-10-05', startTime: '08:00', endDate: '2026-10-05', endTime: '08:45',
      recurrence: { freq: 'weekly', until: null }, exceptions: {},
      location: 'Staff room', classIds: [], staffIds: ['S-3001', 'S-3002'],
      requiresRSVP: false, requiresConsent: false, attachmentName: null,
      description: 'Weekly check-in on room ratios, incidents and upcoming events.',
      rsvps: {}, consents: {},
    },
    {
      id: 'EVT-9002', type: 'Event', seriesId: 'EVT-9002', title: 'Parent-teacher conferences', eventType: 'conference',
      allDay: false, startDate: '2026-10-15', startTime: '15:00', endDate: '2026-10-15', endTime: '18:00',
      recurrence: { freq: 'monthly', until: null }, exceptions: {},
      location: 'Classrooms', classIds: [], staffIds: [],
      requiresRSVP: true, requiresConsent: false, attachmentName: null,
      description: 'Individual 15-minute slots — sign up at the front desk.',
      rsvps: { 'G-2001': 'yes', 'G-2002': 'no' }, consents: {},
    },
    {
      id: 'EVT-9003', type: 'Event', seriesId: 'EVT-9003', title: 'Daisy Room farm visit', eventType: 'trip',
      allDay: false, startDate: '2026-10-22', startTime: '09:30', endDate: '2026-10-22', endTime: '13:00',
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: 'Greenfield Farm', classIds: ['CLS-9003'], staffIds: ['S-3001'],
      requiresRSVP: true, requiresConsent: true, attachmentName: 'farm-visit-itinerary.pdf',
      description: 'A morning visit to see farm animals and the harvest. Please dress for the weather.',
      rsvps: { 'G-2006': 'yes' }, consents: { 'C-1006': true },
    },
    {
      id: 'EVT-9004', type: 'Event', seriesId: 'EVT-9004', title: 'Autumn holiday', eventType: 'holiday',
      allDay: true, startDate: '2026-11-02', startTime: null, endDate: '2026-11-06', endTime: null,
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: '', classIds: [], staffIds: [],
      requiresRSVP: false, requiresConsent: false, attachmentName: null,
      description: 'School closed for the autumn half-term break.',
      rsvps: {}, consents: {},
    },
    {
      id: 'EVT-9005', type: 'Event', seriesId: 'EVT-9005', title: 'Staff training day — school closed', eventType: 'closure',
      allDay: true, startDate: '2026-10-30', startTime: null, endDate: '2026-10-30', endTime: null,
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: '', classIds: [], staffIds: [],
      requiresRSVP: false, requiresConsent: false, attachmentName: null,
      description: 'No childcare available — staff attend first-aid recertification.',
      rsvps: {}, consents: {},
    },
    {
      id: 'EVT-9006', type: 'Event', seriesId: 'EVT-9006', title: 'Harvest festival', eventType: 'event',
      allDay: false, startDate: '2026-10-24', startTime: '10:00', endDate: '2026-10-24', endTime: '12:00',
      recurrence: { freq: 'none', until: null }, exceptions: {},
      location: 'Garden courtyard', classIds: ['CLS-9001', 'CLS-9002', 'CLS-9003'], staffIds: [],
      requiresRSVP: true, requiresConsent: false, attachmentName: null,
      description: 'Families welcome to join us for songs, crafts and a harvest potluck.',
      rsvps: { 'G-2001': 'yes', 'G-2003': 'yes', 'G-2005': 'no' }, consents: {},
    },

    /* ---------- daily routine blocks (Class Workspace — S24) ----------
       Each class's actual configured routine, editable from the Class
       Workspace's Schedule tab. `kind` drives the timeline icon. */
    { id: 'RTN-S1', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Arrival & welcome', startTime: '08:00', endTime: '08:30', kind: 'arrival' },
    { id: 'RTN-S2', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Sensory exploration', startTime: '08:30', endTime: '09:30', kind: 'work-cycle' },
    { id: 'RTN-S3', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Morning snack', startTime: '09:30', endTime: '09:45', kind: 'snack' },
    { id: 'RTN-S4', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Outdoor play', startTime: '09:45', endTime: '10:30', kind: 'outdoor' },
    { id: 'RTN-S5', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Lunch', startTime: '10:30', endTime: '11:15', kind: 'lunch' },
    { id: 'RTN-S6', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Nap time', startTime: '11:15', endTime: '13:00', kind: 'nap' },
    { id: 'RTN-S7', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Afternoon activities', startTime: '13:00', endTime: '14:30', kind: 'afternoon' },
    { id: 'RTN-S8', type: 'RoutineBlock', classId: 'CLS-9001', activity: 'Departure', startTime: '14:30', endTime: '15:00', kind: 'departure' },

    { id: 'RTN-M1', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Arrival & circle time', startTime: '08:15', endTime: '08:45', kind: 'arrival' },
    { id: 'RTN-M2', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Work cycle', startTime: '08:45', endTime: '10:00', kind: 'work-cycle' },
    { id: 'RTN-M3', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Snack', startTime: '10:00', endTime: '10:15', kind: 'snack' },
    { id: 'RTN-M4', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Outdoor play', startTime: '10:15', endTime: '11:00', kind: 'outdoor' },
    { id: 'RTN-M5', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Lunch', startTime: '11:00', endTime: '11:45', kind: 'lunch' },
    { id: 'RTN-M6', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Rest time', startTime: '11:45', endTime: '13:00', kind: 'nap' },
    { id: 'RTN-M7', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Afternoon activities', startTime: '13:00', endTime: '14:45', kind: 'afternoon' },
    { id: 'RTN-M8', type: 'RoutineBlock', classId: 'CLS-9002', activity: 'Departure', startTime: '14:45', endTime: '15:15', kind: 'departure' },

    { id: 'RTN-D1', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Arrival & morning meeting', startTime: '08:30', endTime: '09:00', kind: 'arrival' },
    { id: 'RTN-D2', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Work cycle', startTime: '09:00', endTime: '10:15', kind: 'work-cycle' },
    { id: 'RTN-D3', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Snack', startTime: '10:15', endTime: '10:30', kind: 'snack' },
    { id: 'RTN-D4', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Outdoor play', startTime: '10:30', endTime: '11:15', kind: 'outdoor' },
    { id: 'RTN-D5', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Lunch', startTime: '11:15', endTime: '12:00', kind: 'lunch' },
    { id: 'RTN-D6', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Afternoon activities & projects', startTime: '12:00', endTime: '13:30', kind: 'afternoon' },
    { id: 'RTN-D7', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Second work cycle', startTime: '13:30', endTime: '14:15', kind: 'work-cycle' },
    { id: 'RTN-D8', type: 'RoutineBlock', classId: 'CLS-9003', activity: 'Departure', startTime: '14:15', endTime: '14:45', kind: 'departure' },

    /* ---------- room resources (Class Workspace S24 / Rooms & Resources S28) ----------
       Materials/equipment assigned to each room. `category`+`status` are the
       original S24 fields Class Workspace's Room & Resources tab already
       reads; `curriculumArea`+`condition`+`lastChecked` are added for the
       Materials tab (S28) — same records, no parallel data store. No
       quantity/inventory system exists for these, so condition is a simple
       real field rather than a fabricated count. */
    { id: 'RES-1', type: 'Resource', classId: 'CLS-9001', name: 'Sensory bin — rice & scoops', category: 'sensory', status: 'Available', curriculumArea: 'sensorial', condition: 'Good', lastChecked: '2026-10-06' },
    { id: 'RES-2', type: 'Resource', classId: 'CLS-9001', name: 'Board books set', category: 'books', status: 'Available', curriculumArea: 'language', condition: 'Good', lastChecked: '2026-10-08' },
    { id: 'RES-3', type: 'Resource', classId: 'CLS-9002', name: 'Wooden building blocks', category: 'stem', status: 'In use', curriculumArea: 'mathematics', condition: 'Needs repair', lastChecked: '2026-10-09' },
    { id: 'RES-4', type: 'Resource', classId: 'CLS-9002', name: 'Art & craft trolley', category: 'creative', status: 'Available', curriculumArea: 'culture', condition: 'Good', lastChecked: '2026-10-04' },
    { id: 'RES-5', type: 'Resource', classId: 'CLS-9003', name: 'Science explorer kit', category: 'stem', status: 'Needs restock', curriculumArea: 'culture', condition: 'Missing pieces', lastChecked: '2026-10-07' },
    { id: 'RES-6', type: 'Resource', classId: 'CLS-9003', name: 'Class library — chapter books', category: 'books', status: 'Available', curriculumArea: 'language', condition: 'Good', lastChecked: '2026-10-10' },
    { id: 'RES-7', type: 'Resource', classId: 'CLS-9003', name: 'Outdoor sports equipment bag', category: 'outdoor', status: 'Available', curriculumArea: 'practical-life', condition: 'Good', lastChecked: '2026-10-05' },
    { id: 'RES-8', type: 'Resource', classId: 'CLS-9001', name: 'Pouring & spooning tray', category: 'sensory', status: 'Available', curriculumArea: 'practical-life', condition: 'Good', lastChecked: '2026-10-03' },

    /* ---------- rooms & bookings (S28) ----------
       Each class's own classroom is a Room too (classId set — "current class
       assignment"); the shared spaces below have no fixed class and are the
       ones actually booked via the Rooms tab. */
    { id: 'ROOM-1', type: 'Room', name: 'Sunflower Room', roomType: 'Classroom', location: 'Ground Floor · Room 1', capacity: 14, classId: 'CLS-9001' },
    { id: 'ROOM-2', type: 'Room', name: 'Marigold Room', roomType: 'Classroom', location: 'Ground Floor · Room 2', capacity: 16, classId: 'CLS-9002' },
    { id: 'ROOM-3', type: 'Room', name: 'Daisy Room', roomType: 'Classroom', location: 'First Floor · Room 1', capacity: 15, classId: 'CLS-9003' },
    { id: 'ROOM-4', type: 'Room', name: 'Art Studio', roomType: 'Creative studio', location: 'Ground Floor · Annex', capacity: 12, classId: null },
    { id: 'ROOM-5', type: 'Room', name: 'Multi-Purpose Hall', roomType: 'Hall', location: 'First Floor · Hall', capacity: 60, classId: null },
    { id: 'ROOM-6', type: 'Room', name: 'Outdoor Yard', roomType: 'Outdoor space', location: 'Garden level', capacity: 40, classId: null },

    { id: 'BK-1', type: 'RoomBooking', roomId: 'ROOM-4', title: 'Weekend pottery workshop', classId: 'CLS-9002', staffId: null, date: '2026-10-11', startTime: '10:00', endTime: '11:30', notes: 'Bring aprons', createdAt: '2026-10-07T09:00:00.000Z' },
    { id: 'BK-2', type: 'RoomBooking', roomId: 'ROOM-5', title: 'Staff training session', classId: null, staffId: 'S-3001', date: '2026-10-11', startTime: '09:00', endTime: '10:00', notes: '', createdAt: '2026-10-06T09:00:00.000Z' },

    /* ---------- book library & loans (S28) ----------
       `availableCopies` is always computed live from totalCopies minus
       active (unreturned) BookLoan records — never stored, so it can't
       drift out of sync with the loan records themselves. No cover-image
       asset pipeline exists in this project, so books use an honest
       placeholder icon rather than a fabricated image URL. */
    { id: 'BOOK-1', type: 'Book', title: 'The Very Hungry Caterpillar', author: 'Eric Carle', totalCopies: 3 },
    { id: 'BOOK-2', type: 'Book', title: 'Brown Bear, Brown Bear, What Do You See?', author: 'Bill Martin Jr.', totalCopies: 2 },
    { id: 'BOOK-3', type: 'Book', title: 'Where the Wild Things Are', author: 'Maurice Sendak', totalCopies: 2 },
    { id: 'BOOK-4', type: 'Book', title: 'The Gruffalo', author: 'Julia Donaldson', totalCopies: 3 },
    { id: 'BOOK-5', type: 'Book', title: 'Montessori: The Science Behind the Genius', author: 'Angeline Stoll Lillard', totalCopies: 1 },
    { id: 'BOOK-6', type: 'Book', title: 'Goodnight Moon', author: 'Margaret Wise Brown', totalCopies: 2 },
    { id: 'BOOK-7', type: 'Book', title: "We're Going on a Bear Hunt", author: 'Michael Rosen', totalCopies: 2 },
    { id: 'BOOK-8', type: 'Book', title: 'How to Talk So Kids Will Listen', author: 'Adele Faber', totalCopies: 1 },

    { id: 'LOAN-1', type: 'BookLoan', bookId: 'BOOK-1', borrowerType: 'Child', borrowerId: 'C-1001', borrowerName: 'Amara Osei', loanDate: '2026-10-01', dueDate: '2026-10-08', returnedAt: null },
    { id: 'LOAN-2', type: 'BookLoan', bookId: 'BOOK-5', borrowerType: 'Staff', borrowerId: 'S-3003', borrowerName: 'Meera Fernandes', loanDate: '2026-10-09', dueDate: '2026-10-23', returnedAt: null },
    { id: 'LOAN-3', type: 'BookLoan', bookId: 'BOOK-4', borrowerType: 'Child', borrowerId: 'C-1101', borrowerName: 'Zara Mehta', loanDate: '2026-09-20', dueDate: '2026-09-27', returnedAt: '2026-09-26T10:00:00.000Z' },

    /* ---------- consumable inventory (S28) ----------
       Status (OK/LOW/OUT) is always computed from quantity vs reorderLevel,
       never stored, so it can never go stale relative to the real quantity. */
    { id: 'INV-1', type: 'InventoryItem', name: 'A4 printer paper', category: 'Office supplies', quantity: 4, unit: 'reams', reorderLevel: 5, lastUpdated: '2026-10-09T08:00:00.000Z' },
    { id: 'INV-2', type: 'InventoryItem', name: 'Finger paint sets', category: 'Art supplies', quantity: 0, unit: 'sets', reorderLevel: 3, lastUpdated: '2026-10-05T08:00:00.000Z' },
    { id: 'INV-3', type: 'InventoryItem', name: 'Hand sanitiser', category: 'Health & hygiene', quantity: 18, unit: 'bottles', reorderLevel: 6, lastUpdated: '2026-10-07T08:00:00.000Z' },
    { id: 'INV-4', type: 'InventoryItem', name: 'Nappies (size 4)', category: 'Health & hygiene', quantity: 30, unit: 'packs', reorderLevel: 10, lastUpdated: '2026-10-10T08:00:00.000Z' },
    { id: 'INV-5', type: 'InventoryItem', name: 'Glue sticks', category: 'Art supplies', quantity: 12, unit: 'packs', reorderLevel: 4, lastUpdated: '2026-10-02T08:00:00.000Z' },
    { id: 'INV-6', type: 'InventoryItem', name: 'Tissue boxes', category: 'Health & hygiene', quantity: 2, unit: 'boxes', reorderLevel: 8, lastUpdated: '2026-10-08T08:00:00.000Z' },

    /* ---------- learning framework outcomes (Weekly & Monthly Planner — S27) ----------
       A small real outcome bank activities can link to — there is no existing
       curriculum-framework model in this project, so this is the actual data
       "Activity.outcomeIds" references (not invented per-render). */
    { id: 'OUT-1', type: 'FrameworkOutcome', code: 'PL.1', area: 'practical-life', label: 'Develops independence in everyday self-care routines' },
    { id: 'OUT-2', type: 'FrameworkOutcome', code: 'PL.2', area: 'practical-life', label: 'Builds fine motor control through purposeful movement' },
    { id: 'OUT-3', type: 'FrameworkOutcome', code: 'SEN.1', area: 'sensorial', label: 'Refines visual discrimination of size, shape and dimension' },
    { id: 'OUT-4', type: 'FrameworkOutcome', code: 'SEN.2', area: 'sensorial', label: 'Develops auditory and tactile discrimination' },
    { id: 'OUT-5', type: 'FrameworkOutcome', code: 'LANG.1', area: 'language', label: 'Builds phonemic awareness through sound and language games' },
    { id: 'OUT-6', type: 'FrameworkOutcome', code: 'LANG.2', area: 'language', label: 'Expands vocabulary through naming and classification' },
    { id: 'OUT-7', type: 'FrameworkOutcome', code: 'MATH.1', area: 'mathematics', label: 'Understands one-to-one correspondence with concrete materials' },
    { id: 'OUT-8', type: 'FrameworkOutcome', code: 'MATH.2', area: 'mathematics', label: 'Recognises and extends simple patterns and sequences' },
    { id: 'OUT-9', type: 'FrameworkOutcome', code: 'ART.1', area: 'creative', label: 'Expresses ideas through open-ended creative materials' },
    { id: 'OUT-10', type: 'FrameworkOutcome', code: 'ART.2', area: 'creative', label: 'Develops gross motor confidence through active, outdoor play' },

    /* ---------- activity library (Weekly & Monthly Planner — S27) ----------
       Reused across the weekly grid, monthly themes and the activity-detail
       modal. `ageRangeMonths` and `outcomeIds` are real fields other UI reads
       — never fabricated at render time. */
    { id: 'ACT-1', type: 'Activity', name: 'Pouring & spooning practice', area: 'practical-life', description: 'Transferring dry rice between small pitchers using a spoon, then a ladle.', objectives: 'Build hand-eye coordination and the concentration needed for independent self-care.', materials: ['Small pitcher', 'Tray', 'Dry rice', 'Spoon'], ageRangeMonths: [18, 36], outcomeIds: ['OUT-1', 'OUT-2'], notes: '' },
    { id: 'ACT-2', type: 'Activity', name: 'Dressing frames', area: 'practical-life', description: 'Practising buttons, zips and buckles on wooden dressing frames.', objectives: 'Develop the fine motor skills and sequencing needed for independent dressing.', materials: ['Dressing frame set'], ageRangeMonths: [24, 48], outcomeIds: ['OUT-1', 'OUT-2'], notes: '' },
    { id: 'ACT-3', type: 'Activity', name: 'Pink tower', area: 'sensorial', description: 'Building a tower from ten pink cubes graded by size.', objectives: 'Refine visual discrimination of dimension and develop a sense of order.', materials: ['Pink tower set'], ageRangeMonths: [30, 60], outcomeIds: ['OUT-3'], notes: '' },
    { id: 'ACT-4', type: 'Activity', name: 'Sound cylinders', area: 'sensorial', description: 'Matching pairs of cylinders by the sound they make when shaken.', objectives: 'Sharpen auditory discrimination and careful listening.', materials: ['Sound cylinder set'], ageRangeMonths: [36, 72], outcomeIds: ['OUT-4'], notes: '' },
    { id: 'ACT-5', type: 'Activity', name: 'I-spy sound games', area: 'language', description: 'Guessing objects around the room from their beginning sound.', objectives: 'Build phonemic awareness ahead of early reading.', materials: ['Small object basket'], ageRangeMonths: [36, 72], outcomeIds: ['OUT-5'], notes: '' },
    { id: 'ACT-6', type: 'Activity', name: 'Storytime & retelling', area: 'language', description: 'A read-aloud story followed by children retelling it in their own words.', objectives: 'Expand vocabulary and build narrative sequencing.', materials: ['Picture book'], ageRangeMonths: [24, 84], outcomeIds: ['OUT-6'], notes: '' },
    { id: 'ACT-7', type: 'Activity', name: 'Number rods', area: 'mathematics', description: 'Associating quantity 1–10 with graduated wooden rods.', objectives: 'Build a concrete sense of quantity before symbolic numbers.', materials: ['Number rod set'], ageRangeMonths: [36, 72], outcomeIds: ['OUT-7'], notes: '' },
    { id: 'ACT-8', type: 'Activity', name: 'Pattern block sequencing', area: 'mathematics', description: 'Continuing and creating repeating patterns with coloured blocks.', objectives: 'Recognise, extend and create simple patterns.', materials: ['Pattern blocks'], ageRangeMonths: [42, 84], outcomeIds: ['OUT-8'], notes: '' },
    { id: 'ACT-9', type: 'Activity', name: 'Watercolour exploration', area: 'creative', description: 'Open-ended painting with watercolours on large paper.', objectives: 'Encourage free expression and experimentation with colour.', materials: ['Watercolour set', 'Paper', 'Brushes', 'Aprons'], ageRangeMonths: [24, 84], outcomeIds: ['OUT-9'], notes: '' },
    { id: 'ACT-10', type: 'Activity', name: 'Obstacle course', area: 'creative', description: 'A simple outdoor obstacle course of hoops, cones and a balance beam.', objectives: 'Build gross motor confidence, balance and coordination.', materials: ['Cones', 'Hoops', 'Balance beam'], ageRangeMonths: [30, 84], outcomeIds: ['OUT-10'], notes: '' },
    { id: 'ACT-11', type: 'Activity', name: 'Nature walk & collection', area: 'creative', description: 'A guided walk collecting leaves, seeds and other natural materials to sort back in class.', objectives: 'Connect outdoor movement with observation and later sorting activities.', materials: ['Collection baskets'], ageRangeMonths: [24, 84], outcomeIds: ['OUT-10'], notes: '' },
    { id: 'ACT-12', type: 'Activity', name: 'Practical life: table washing', area: 'practical-life', description: 'A full washing sequence — wetting, soaping, scrubbing and drying a small table.', objectives: 'Build a complete, ordered work cycle and care for the environment.', materials: ['Basin', 'Sponge', 'Apron', 'Drying cloth'], ageRangeMonths: [30, 60], outcomeIds: ['OUT-1'], notes: '' },

    /* ---------- monthly themes (Weekly & Monthly Planner — S27) ---------- */
    { id: 'THM-1', type: 'MonthlyTheme', classId: 'CLS-9001', month: '2026-10', weekStart: '2026-10-05', name: 'Getting to know our garden', focusAreas: ['sensorial', 'practical-life'], vocabulary: ['soil', 'seed', 'root', 'watering can'], description: 'Hands-on exploration of the school garden — textures, smells and simple planting.', linkedActivityIds: ['ACT-1', 'ACT-3'] },
    { id: 'THM-2', type: 'MonthlyTheme', classId: 'CLS-9001', month: '2026-10', weekStart: '2026-10-12', name: 'Colours all around us', focusAreas: ['sensorial', 'creative'], vocabulary: ['primary', 'mix', 'bright', 'pale'], description: 'Noticing and naming colour in nature, then mixing and painting with it.', linkedActivityIds: ['ACT-9'] },
    { id: 'THM-3', type: 'MonthlyTheme', classId: 'CLS-9001', month: '2026-10', weekStart: '2026-10-19', name: 'Autumn harvest', focusAreas: ['practical-life', 'mathematics'], vocabulary: ['harvest', 'pumpkin', 'count', 'basket'], description: 'Sorting and counting autumn produce while building practical-life care routines.', linkedActivityIds: ['ACT-7', 'ACT-12'] },
    { id: 'THM-4', type: 'MonthlyTheme', classId: 'CLS-9001', month: '2026-10', weekStart: '2026-10-26', name: 'Sounds and rhymes', focusAreas: ['language'], vocabulary: ['rhyme', 'syllable', 'loud', 'quiet'], description: 'Playful sound games and rhyming stories to build early literacy.', linkedActivityIds: ['ACT-5', 'ACT-6'] },

    /* ---------- weekly plan (Weekly & Monthly Planner — S27) ----------
       One real prior week, already approved, so "Copy last week" has
       genuine source data to demonstrate against from the very first load.
       `assignments` keys are `Day::routineBlockId`, matching CLS-9001's own
       RoutineBlock rows (RTN-S1..RTN-S8) — the same timetable Class
       Workspace's Schedule tab reads/writes, so both pages share one truth. */
    {
      id: 'WP-1', type: 'WeeklyPlan', classId: 'CLS-9001', weekStart: '2026-09-28', status: 'Approved',
      assignments: {
        'Mon::RTN-S2': ['ACT-1'], 'Mon::RTN-S7': ['ACT-9'],
        'Tue::RTN-S2': ['ACT-3'], 'Tue::RTN-S4': ['ACT-10'],
        'Wed::RTN-S2': ['ACT-1', 'ACT-12'],
        'Thu::RTN-S2': ['ACT-5'], 'Thu::RTN-S7': ['ACT-9'],
        'Fri::RTN-S4': ['ACT-11'],
      },
      submittedBy: 'Meera Fernandes', submittedAt: '2026-09-25T09:00:00.000Z',
      reviewedBy: 'Nithya', reviewedAt: '2026-09-25T14:00:00.000Z', reviewComment: null,
      createdAt: '2026-09-24T10:00:00.000Z', updatedAt: '2026-09-25T14:00:00.000Z',
    },

    /* ---------- messaging hub (S29) ----------
       Conversation is new; Message is the SAME type family.js/children.js
       already create (subject/body/recipientGuardianIds/date) — this just
       adds conversationId/senderType/createdAt/attachments/status/readBy so
       one thread model serves both the legacy broadcast composer and this
       full hub. `recipientGuardianIds` stays populated on family messages
       so family.js's existing message list keeps working unchanged. */
    { id: 'CONV-1', type: 'Conversation', kind: 'family', familyId: 'FAM-G-2001', childId: 'C-1001', createdAt: '2026-10-10T08:00:00.000Z', lastMessageAt: '2026-10-11T09:20:00.000Z' },
    { id: 'CONV-2', type: 'Conversation', kind: 'staff', staffId: 'S-3002', createdAt: '2026-10-11T08:25:00.000Z', lastMessageAt: '2026-10-11T08:31:00.000Z' },
    { id: 'CONV-3', type: 'Conversation', kind: 'group', classId: 'CLS-9001', createdAt: '2026-10-10T16:00:00.000Z', lastMessageAt: '2026-10-10T16:00:00.000Z' },

    { id: 'MSG-SEED-1', type: 'Message', conversationId: 'CONV-1', subject: '', body: "Hi Folasade, just confirming Amara's EpiPen is up to date in our office — could you double check the expiry date when you get a chance?", recipientGuardianIds: ['G-2001'], date: '2026-10-11', createdAt: '2026-10-11T09:00:00.000Z', senderType: 'Staff', senderId: 'S-3001', senderName: 'Nithya', status: 'sent', attachments: [], readBy: ['S-3001'] },
    { id: 'MSG-SEED-2', type: 'Message', conversationId: 'CONV-1', subject: '', body: "Thank you for the heads up — I'll check tonight and send a new one if needed.", recipientGuardianIds: [], date: '2026-10-11', createdAt: '2026-10-11T09:15:00.000Z', senderType: 'Guardian', senderId: 'G-2001', senderName: 'Folasade Osei', status: 'sent', attachments: [], readBy: [] },
    { id: 'MSG-SEED-3', type: 'Message', conversationId: 'CONV-1', subject: '', body: 'Wonderful, thank you Folasade!', recipientGuardianIds: ['G-2001'], date: '2026-10-11', createdAt: '2026-10-11T09:20:00.000Z', senderType: 'Staff', senderId: 'S-3001', senderName: 'Nithya', status: 'sent', attachments: [], readBy: ['S-3001'] },

    { id: 'MSG-SEED-4', type: 'Message', conversationId: 'CONV-2', subject: '', body: 'Morning! Can you cover the 3pm handover for Marigold today?', recipientGuardianIds: [], date: '2026-10-11', createdAt: '2026-10-11T08:25:00.000Z', senderType: 'Staff', senderId: 'S-3001', senderName: 'Nithya', status: 'sent', attachments: [], readBy: ['S-3001'] },
    { id: 'MSG-SEED-5', type: 'Message', conversationId: 'CONV-2', subject: '', body: "Yes, I'll be there.", recipientGuardianIds: [], date: '2026-10-11', createdAt: '2026-10-11T08:31:00.000Z', senderType: 'Staff', senderId: 'S-3002', senderName: 'Rhea Kapoor', status: 'sent', attachments: [], readBy: [] },

    { id: 'MSG-SEED-6', type: 'Message', conversationId: 'CONV-3', subject: 'Reminder', body: "Reminder: it's library day tomorrow — please send your child's library bag in!", recipientGuardianIds: ['G-2001', 'G-1101', 'G-1102', 'G-1103', 'G-1104', 'G-1105', 'G-1106', 'G-1107'], date: '2026-10-10', createdAt: '2026-10-10T16:00:00.000Z', senderType: 'Staff', senderId: 'S-3001', senderName: 'Nithya', status: 'sent', attachments: [], readBy: ['S-3001'] },

    /* ---------- announcements (S30) ----------
       Extends the SAME Announcement type dashboard.js's quick composer
       already creates (title/message/audience/date) — audienceType/classIds
       add real targeting, reads/acks mirror the Event record's existing
       rsvps/consents map convention (keyed by Family id, not a separate
       per-recipient table). Legacy dashboard-created announcements simply
       lack these fields and are shown with an honest "no recipient data"
       state rather than a fabricated recipient list. */
    {
      id: 'ANN-1', type: 'Announcement', title: 'Harvest Festival — Saturday 24th', message: "We're excited to welcome families to our Harvest Festival this Saturday from 10am. Expect songs, crafts and a potluck lunch — see you there!",
      audienceType: 'all', classIds: [], audience: 'All families', channels: ['in-app', 'email'], requireAck: false,
      status: 'Sent', date: '2026-10-08', sentAt: '2026-10-08T09:00:00.000Z', createdAt: '2026-10-08T08:55:00.000Z',
      reads: { 'FAM-G-2001': '2026-10-08T10:00:00.000Z', 'FAM-G-2002': '2026-10-08T11:00:00.000Z', 'FAM-G-1101': '2026-10-08T12:00:00.000Z', 'FAM-G-1102': '2026-10-09T09:00:00.000Z', 'FAM-G-1103': '2026-10-09T10:00:00.000Z' }, acks: {},
    },
    {
      id: 'ANN-2', type: 'Announcement', title: 'Farm visit — permission required', message: "Daisy Room's farm visit is on 22 October. Please confirm you've seen this message so we can finalise transport.",
      audienceType: 'classes', classIds: ['CLS-9003'], audience: 'Daisy Room', channels: ['in-app', 'email', 'push'], requireAck: true,
      status: 'Sent', date: '2026-10-09', sentAt: '2026-10-09T08:00:00.000Z', createdAt: '2026-10-09T07:55:00.000Z',
      reads: { 'FAM-G-1121': '2026-10-09T09:00:00.000Z', 'FAM-G-1122': '2026-10-09T10:30:00.000Z' }, acks: { 'FAM-G-1121': '2026-10-09T09:01:00.000Z' },
    },
    {
      id: 'ANN-3', type: 'Announcement', title: 'Half-term closure reminder', message: 'A reminder that the school will be closed for the autumn half-term from 2–6 November.',
      audienceType: 'all', classIds: [], audience: 'All families', channels: ['in-app'], requireAck: false,
      status: 'Scheduled', date: null, scheduledFor: '2026-10-13T09:00:00.000Z', createdAt: '2026-10-11T08:00:00.000Z',
      reads: {}, acks: {},
    },
    {
      id: 'ANN-4', type: 'Announcement', title: 'Sunflower Room — new sensory materials', message: "We've added new sensory play materials to Sunflower Room this week — ask your child what they explored today!",
      audienceType: 'classes', classIds: ['CLS-9001'], audience: 'Sunflower Room', channels: ['in-app'], requireAck: false,
      status: 'Draft', date: null, createdAt: '2026-10-11T07:00:00.000Z',
      reads: {}, acks: {},
    },

    /* ---------- Family Forms (S31) ----------
       FormDef holds the question list + conditional logic + audience/due date;
       FormResponse is one submission per respondent, keyed by Family id (same
       convention as Announcement reads/acks). File-question answers only ever
       store {name,size,type} metadata — the actual file bytes are never kept,
       so results never show a fake download link. */
    {
      id: 'FORM-1', type: 'FormDef', title: 'Autumn Activity Feedback', formType: 'Survey',
      description: "A quick check-in on how this term's activities have gone for your family.",
      status: 'Open', audienceType: 'all', classIds: [], dueDate: '2026-10-20',
      createdAt: '2026-10-04T09:00:00.000Z', publishedAt: '2026-10-05T09:00:00.000Z', closedAt: null,
      lastReminderAt: null, lastReminderCount: 0,
      questions: [
        { id: 'Q-1A', type: 'single', title: 'Which activity did your child enjoy most this term?', description: '', required: true, options: [{ id: 'OPT-1A1', label: 'Music & Movement' }, { id: 'OPT-1A2', label: 'Outdoor Play' }, { id: 'OPT-1A3', label: 'Arts & Crafts' }, { id: 'OPT-1A4', label: 'Story Time' }], showIf: null },
        { id: 'Q-1B', type: 'rating', title: 'How satisfied are you with our communication?', description: '1 = not satisfied, 5 = very satisfied', required: true, options: [], showIf: null },
        { id: 'Q-1C', type: 'long', title: "Tell us about your child's experience this term.", description: '', required: false, options: [], showIf: null },
        { id: 'Q-1D', type: 'short', title: 'What would you like us to improve?', description: '', required: false, options: [], showIf: null },
      ],
    },
    {
      id: 'RESP-1A', type: 'FormResponse', formId: 'FORM-1', familyId: 'FAM-G-2001', respondentName: 'Osei Family', submittedAt: '2026-10-06T10:00:00.000Z',
      answers: { 'Q-1A': 'OPT-1A2', 'Q-1B': 5, 'Q-1C': 'Amara comes home talking about the garden every day!', 'Q-1D': '' },
    },
    {
      id: 'RESP-1B', type: 'FormResponse', formId: 'FORM-1', familyId: 'FAM-G-2002', respondentName: 'Kapoor Family', submittedAt: '2026-10-06T14:30:00.000Z',
      answers: { 'Q-1A': 'OPT-1A3', 'Q-1B': 4, 'Q-1C': '', 'Q-1D': 'More updates on nap times would help.' },
    },
    {
      id: 'RESP-1C', type: 'FormResponse', formId: 'FORM-1', familyId: 'FAM-G-1101', respondentName: 'Thompson Family', submittedAt: '2026-10-07T08:45:00.000Z',
      answers: { 'Q-1A': 'OPT-1A1', 'Q-1B': 5, 'Q-1C': 'Lily loves music time, she sings the songs at home.', 'Q-1D': '' },
    },
    {
      id: 'RESP-1D', type: 'FormResponse', formId: 'FORM-1', familyId: 'FAM-G-1102', respondentName: 'Hassan Family', submittedAt: '2026-10-08T09:10:00.000Z',
      answers: { 'Q-1A': 'OPT-1A4', 'Q-1B': 3, 'Q-1C': '', 'Q-1D': 'Could the story list be shared with families?' },
    },
    {
      id: 'RESP-1E', type: 'FormResponse', formId: 'FORM-1', familyId: 'FAM-G-1121', respondentName: 'Gupta Family', submittedAt: '2026-10-09T16:00:00.000Z',
      answers: { 'Q-1A': 'OPT-1A2', 'Q-1B': 4, 'Q-1C': 'Yash has been much more confident outdoors.', 'Q-1D': '' },
    },

    {
      id: 'FORM-2', type: 'FormDef', title: 'Local Trip Permission', formType: 'Permission',
      description: 'Daisy Room is visiting the local park on 24 October — please confirm permission by the due date.',
      status: 'Open', audienceType: 'classes', classIds: ['CLS-9003'], dueDate: '2026-10-22',
      createdAt: '2026-10-08T08:00:00.000Z', publishedAt: '2026-10-09T08:00:00.000Z', closedAt: null,
      lastReminderAt: null, lastReminderCount: 0,
      questions: [
        { id: 'Q-2A', type: 'yesno', title: 'Do you give permission for the local park trip on 24 October?', description: '', required: true, options: [], showIf: null },
        { id: 'Q-2B', type: 'short', title: 'Please tell us why you cannot give permission.', description: '', required: true, options: [], showIf: { questionId: 'Q-2A', equals: 'No' } },
      ],
    },
    {
      id: 'RESP-2A', type: 'FormResponse', formId: 'FORM-2', familyId: 'FAM-G-1123', respondentName: 'Nair Family', submittedAt: '2026-10-09T18:00:00.000Z',
      answers: { 'Q-2A': 'Yes' },
    },
    {
      id: 'RESP-2B', type: 'FormResponse', formId: 'FORM-2', familyId: 'FAM-G-1122', respondentName: 'Bose Family', submittedAt: '2026-10-10T07:30:00.000Z',
      answers: { 'Q-2A': 'No', 'Q-2B': 'Away on a family trip that week.' },
    },

    {
      id: 'FORM-3', type: 'FormDef', title: 'Updated Collection Policy', formType: 'Acknowledgement',
      description: 'Please read the updated end-of-day collection policy and sign to confirm you have seen it.',
      status: 'Closed', audienceType: 'all', classIds: [], dueDate: '2026-09-30',
      createdAt: '2026-09-12T09:00:00.000Z', publishedAt: '2026-09-15T09:00:00.000Z', closedAt: '2026-10-01T09:00:00.000Z',
      lastReminderAt: '2026-09-27T09:00:00.000Z', lastReminderCount: 12,
      questions: [
        { id: 'Q-3A', type: 'yesno', title: 'Have you read the updated collection policy?', description: 'Children may now only be collected by guardians listed on their authorised pickup list.', required: true, options: [], showIf: null },
        { id: 'Q-3B', type: 'signature', title: 'Parent or guardian signature', description: 'Sign using your finger or mouse to confirm you accept the policy.', required: true, options: [], showIf: null },
      ],
    },
    {
      id: 'RESP-3A', type: 'FormResponse', formId: 'FORM-3', familyId: 'FAM-G-2001', respondentName: 'Osei Family', submittedAt: '2026-09-18T10:00:00.000Z',
      answers: { 'Q-3A': 'Yes', 'Q-3B': { dataUrl: DEMO_SIGNATURE_DATA_URL, signedAt: '2026-09-18T10:00:00.000Z' } },
    },
    {
      id: 'RESP-3B', type: 'FormResponse', formId: 'FORM-3', familyId: 'FAM-G-2002', respondentName: 'Kapoor Family', submittedAt: '2026-09-19T11:20:00.000Z',
      answers: { 'Q-3A': 'Yes', 'Q-3B': { dataUrl: DEMO_SIGNATURE_DATA_URL, signedAt: '2026-09-19T11:20:00.000Z' } },
    },
    {
      id: 'RESP-3C', type: 'FormResponse', formId: 'FORM-3', familyId: 'FAM-G-1101', respondentName: 'Thompson Family', submittedAt: '2026-09-20T08:05:00.000Z',
      answers: { 'Q-3A': 'Yes', 'Q-3B': { dataUrl: DEMO_SIGNATURE_DATA_URL, signedAt: '2026-09-20T08:05:00.000Z' } },
    },

    {
      id: 'FORM-4', type: 'FormDef', title: 'New Parent Handbook Review', formType: 'Survey',
      description: '', status: 'Draft', audienceType: null, classIds: [], dueDate: null,
      createdAt: '2026-10-11T07:30:00.000Z', publishedAt: null, closedAt: null,
      lastReminderAt: null, lastReminderCount: 0,
      questions: [],
    },

    /* ---------- Parent–Teacher Conferences (S32) ----------
       ConferenceSlot = one bookable window for one teacher; ConferenceBooking
       = a family's confirmed meeting against a slot; ConferenceRecord = the
       notes/actions/follow-up captured after a meeting, one per booking. */
    { id: 'CSLOT-1', type: 'ConferenceSlot', teacherId: 'S-3003', date: CONF_D1, startTime: '15:00', endTime: '15:15', status: 'Open', bookingId: null },
    { id: 'CSLOT-2', type: 'ConferenceSlot', teacherId: 'S-3003', date: CONF_D1, startTime: '15:15', endTime: '15:30', status: 'Open', bookingId: null },
    { id: 'CSLOT-3', type: 'ConferenceSlot', teacherId: 'S-3003', date: CONF_D1, startTime: '15:30', endTime: '15:45', status: 'Booked', bookingId: 'CBK-1' },
    { id: 'CSLOT-4', type: 'ConferenceSlot', teacherId: 'S-3003', date: CONF_D2, startTime: '15:00', endTime: '15:15', status: 'Open', bookingId: null },
    { id: 'CSLOT-5', type: 'ConferenceSlot', teacherId: 'S-3003', date: CONF_D2, startTime: '15:15', endTime: '15:30', status: 'Open', bookingId: null },
    { id: 'CSLOT-12', type: 'ConferenceSlot', teacherId: 'S-3003', date: CONF_D2, startTime: '15:30', endTime: '15:45', status: 'Open', bookingId: null },
    { id: 'CSLOT-6', type: 'ConferenceSlot', teacherId: 'S-3002', date: CONF_D1, startTime: '16:00', endTime: '16:15', status: 'Open', bookingId: null },
    { id: 'CSLOT-7', type: 'ConferenceSlot', teacherId: 'S-3002', date: CONF_D1, startTime: '16:15', endTime: '16:30', status: 'Booked', bookingId: 'CBK-2' },
    { id: 'CSLOT-8', type: 'ConferenceSlot', teacherId: 'S-3002', date: CONF_D2, startTime: '16:00', endTime: '16:15', status: 'Open', bookingId: null },
    { id: 'CSLOT-9', type: 'ConferenceSlot', teacherId: 'S-3002', date: CONF_D3, startTime: '16:00', endTime: '16:15', status: 'Open', bookingId: null },
    { id: 'CSLOT-10', type: 'ConferenceSlot', teacherId: 'S-3002', date: CONF_D3, startTime: '16:15', endTime: '16:30', status: 'Open', bookingId: null },
    { id: 'CSLOT-11', type: 'ConferenceSlot', teacherId: 'S-3003', date: CONF_PAST, startTime: '14:00', endTime: '14:15', status: 'Booked', bookingId: 'CBK-3' },

    { id: 'CBK-1', type: 'ConferenceBooking', slotId: 'CSLOT-3', teacherId: 'S-3003', date: CONF_D1, startTime: '15:30', endTime: '15:45', familyId: 'FAM-G-1101', childId: 'C-1101', mode: 'In person', note: '', status: 'Upcoming', createdAt: new Date().toISOString(), cancelledAt: null, cancelReason: null },
    { id: 'CBK-2', type: 'ConferenceBooking', slotId: 'CSLOT-7', teacherId: 'S-3002', date: CONF_D1, startTime: '16:15', endTime: '16:30', familyId: 'FAM-G-1106', childId: 'C-1106', mode: 'Video', note: 'Discuss reading progress.', status: 'Upcoming', createdAt: new Date().toISOString(), cancelledAt: null, cancelReason: null },
    { id: 'CBK-3', type: 'ConferenceBooking', slotId: 'CSLOT-11', teacherId: 'S-3003', date: CONF_PAST, startTime: '14:00', endTime: '14:15', familyId: 'FAM-G-2001', childId: 'C-1001', mode: 'In person', note: '', status: 'Completed', createdAt: CONF_PAST + 'T09:00:00.000Z', cancelledAt: null, cancelReason: null },
    { id: 'CBK-4', type: 'ConferenceBooking', slotId: 'CSLOT-12', teacherId: 'S-3003', date: CONF_D2, startTime: '15:30', endTime: '15:45', familyId: 'FAM-G-1102', childId: 'C-1102', mode: 'In person', note: '', status: 'Cancelled', createdAt: new Date().toISOString(), cancelledAt: new Date().toISOString(), cancelReason: 'Family rescheduled for another week.' },

    {
      id: 'CREC-1', type: 'ConferenceRecord', bookingId: 'CBK-3', familyId: 'FAM-G-2001', childId: 'C-1001', teacherId: 'S-3003',
      date: CONF_PAST, startTime: '14:00', mode: 'In person',
      notes: "Amara has settled in wonderfully this term and shows strong confidence joining group activities. We discussed extending her outdoor exploration time and introducing more water play.",
      actions: [
        { id: 'ACT-1', description: 'Share updated outdoor-play photos with the family', owner: 'Meera Fernandes', dueDate: confIsoPlusDays(2), done: false },
        { id: 'ACT-2', description: 'Adjust nap schedule to match home routine', owner: 'Osei Family', dueDate: confIsoPlusDays(-1), done: true },
      ],
      followUpDate: confIsoPlusDays(-1), sharedWithFamily: true, createdAt: CONF_PAST + 'T15:00:00.000Z', updatedAt: CONF_PAST + 'T15:00:00.000Z',
    },
  ];

  /* ---------- roster expansion ----------
     A handful of hand-written seed children is enough to exercise every
     feature, but it leaves each class with only 0–2 Active children, which
     makes the Live Attendance page's counters/ratio look sparse and
     unrealistic. This fills each class out to a believable size. Written as
     a compact table + loop (not 29 duplicated record blocks) for the same
     child/guardian/authorizedPickup shape used by the hand-written seed
     children above — nothing here is hidden or computed differently. */
  (function expandRoster() {
    const ROSTER = [
      // [firstName, lastName, room, dob, guardianFirst, guardianLast, relation]
      ['Zara', 'Mehta', 'Sunflower Room', '2024-05-14', 'Kavya', 'Mehta', 'Mother'],
      ['Ishaan', 'Das', 'Sunflower Room', '2023-11-02', 'Arjun', 'Das', 'Father'],
      ['Lily', 'Thompson', 'Sunflower Room', '2024-01-20', 'Grace', 'Thompson', 'Mother'],
      ['Tariq', 'Hassan', 'Sunflower Room', '2023-09-08', 'Yusuf', 'Hassan', 'Father'],
      ['Nora', 'Lindqvist', 'Sunflower Room', '2024-03-30', 'Elin', 'Lindqvist', 'Mother'],
      ['Kai', 'Nakamura', 'Sunflower Room', '2023-07-17', 'Sato', 'Nakamura', 'Father'],
      ['Amelia', 'Santos', 'Sunflower Room', '2024-02-11', 'Camila', 'Santos', 'Mother'],

      ['Dev', 'Patel', 'Marigold Room', '2021-06-05', 'Nisha', 'Patel', 'Mother'],
      ['Ella', 'Morgan', 'Marigold Room', '2020-12-19', 'James', 'Morgan', 'Father'],
      ['Rohan', 'Verma', 'Marigold Room', '2021-04-22', 'Sunita', 'Verma', 'Mother'],
      ['Grace', 'Okafor', 'Marigold Room', '2020-08-30', 'Chidi', 'Okafor', 'Father'],
      ['Vikram', 'Rao', 'Marigold Room', '2021-01-15', 'Lakshmi', 'Rao', 'Mother'],
      ['Sofia', 'Garcia', 'Marigold Room', '2020-10-09', 'Elena', 'Garcia', 'Mother'],
      ['Anika', 'Chowdhury', 'Marigold Room', '2021-07-02', 'Rafiq', 'Chowdhury', 'Father'],
      ['Noah', 'Mitchell', 'Marigold Room', '2020-11-25', 'Hannah', 'Mitchell', 'Mother'],
      ['Priya', 'Iyer', 'Marigold Room', '2021-03-18', 'Ramesh', 'Iyer', 'Father'],
      ['Liam', "O'Connor", 'Marigold Room', '2020-09-14', 'Siobhan', "O'Connor", 'Mother'],
      ['Tara', 'Krishnan', 'Marigold Room', '2021-05-27', 'Deepa', 'Krishnan', 'Mother'],
      ['Omar', 'Ali', 'Marigold Room', '2020-07-11', 'Fatima', 'Ali', 'Mother'],
      ['Isla', 'Fraser', 'Marigold Room', '2021-02-08', 'Robert', 'Fraser', 'Father'],
      ['Yash', 'Gupta', 'Marigold Room', '2020-06-21', 'Anjali', 'Gupta', 'Mother'],

      ['Maya', 'Bose', 'Daisy Room', '2018-04-16', 'Rina', 'Bose', 'Mother'],
      ['Arjun', 'Nair', 'Daisy Room', '2017-11-30', 'Divya', 'Nair', 'Mother'],
      ['Nina', 'Castillo', 'Daisy Room', '2018-08-05', 'Marco', 'Castillo', 'Father'],
      ['Rafael', 'Silva', 'Daisy Room', '2017-06-12', 'Beatriz', 'Silva', 'Mother'],
      ['Chloe', 'Bennett', 'Daisy Room', '2018-02-27', 'David', 'Bennett', 'Father'],
      ['Advait', 'Joshi', 'Daisy Room', '2017-09-19', 'Meera', 'Joshi', 'Mother'],
      ['Layla', 'Ibrahim', 'Daisy Room', '2018-01-08', 'Khalid', 'Ibrahim', 'Father'],
      ['Felix', 'Andersson', 'Daisy Room', '2017-12-03', 'Karin', 'Andersson', 'Mother'],
    ];
    ROSTER.forEach((row, i) => {
      const [first, last, room, dob, gFirst, gLast, relation] = row;
      const n = 1101 + i;
      const childId = 'C-' + n;
      const guardianId = 'G-' + n;
      const pickupId = 'PU-' + n;
      const fullName = first + ' ' + last;
      const guardianName = gFirst + ' ' + gLast;
      records.push({
        id: childId, type: 'Child', name: fullName, room, status: 'Active', guardianId,
        dob, startDate: '2026-01-12', alerts: [],
        authorizedPickups: [{ id: pickupId, name: guardianName, relation, restricted: false, passcode: null }],
      });
      records.push({
        id: guardianId, type: 'Guardian', name: guardianName, relation: 'Parent of ' + fullName, status: 'Active',
        contact: (gFirst + '.' + gLast).toLowerCase().replace(/[^a-z.]/g, '') + '@example.com',
      });
    });
  })();

  /* ---------- persisted additions (classes, staff, etc. added post-seed) ----------
     The static `records` above is the seed dataset. Anything added at runtime
     (e.g. by the onboarding wizard) is appended to the same live array so every
     existing consumer (search, dashboard, record pages) sees it immediately,
     and mirrored to localStorage so it survives a refresh. */
  const EXTRA_RECORDS_KEY = 'ps_extra_records';
  function loadExtraRecords() {
    try { return JSON.parse(localStorage.getItem(EXTRA_RECORDS_KEY) || '[]'); } catch (e) { return []; }
  }
  function saveExtraRecords(list) {
    try { localStorage.setItem(EXTRA_RECORDS_KEY, JSON.stringify(list)); } catch (e) { /* storage unavailable */ }
  }
  records.push(...loadExtraRecords());

  /* ---------- persisted edits to existing records (status changes, moves, withdrawals, …) ----------
     Keyed by record id so a seed record (not in the extras array above) can still
     be edited in place and survive a refresh, without duplicating it. */
  const RECORD_OVERRIDES_KEY = 'ps_record_overrides';
  function loadOverrides() {
    try { return JSON.parse(localStorage.getItem(RECORD_OVERRIDES_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveOverrides(map) {
    try { localStorage.setItem(RECORD_OVERRIDES_KEY, JSON.stringify(map)); } catch (e) { /* storage unavailable */ }
  }
  (function applyOverrides() {
    const overrides = loadOverrides();
    records.forEach((r) => { if (overrides[r.id]) Object.assign(r, overrides[r.id]); });
  })();

  function addRecord(record) {
    records.push(record);
    const extras = loadExtraRecords();
    extras.push(record);
    saveExtraRecords(extras);
    return record;
  }
  function updateRecord(id, patch) {
    const record = records.find((r) => normalize(r.id) === normalize(id));
    if (!record) return null;
    Object.assign(record, patch);
    const overrides = loadOverrides();
    overrides[id] = Object.assign({}, overrides[id], patch);
    saveOverrides(overrides);
    return record;
  }
  function removeRecord(id) {
    const idx = records.findIndex((r) => normalize(r.id) === normalize(id));
    if (idx !== -1) records.splice(idx, 1);
    saveExtraRecords(loadExtraRecords().filter((r) => normalize(r.id) !== normalize(id)));
  }
  function getByType(type) {
    return records.filter((r) => r.type === type);
  }

  /* ---------- Families (S15) ----------
     No separate "family" concept existed before S15 — a family is derived
     from each child's primary guardian (childs.guardianId is the one stable
     link every child has) and persisted as a real Family record the first
     time it's seen, exactly like any other addRecord-created record. Runs on
     every load so a sibling enrolled later (S-ENROL) joins its existing
     family instead of spawning a duplicate one. */
  function ensureFamiliesForAllChildren() {
    const existingFamilies = records.filter((r) => r.type === 'Family');
    const coveredChildIds = new Set();
    existingFamilies.forEach((f) => (f.childIds || []).forEach((id) => coveredChildIds.add(id)));
    const unclaimed = records.filter((r) => r.type === 'Child' && r.guardianId && !coveredChildIds.has(r.id));
    if (!unclaimed.length) return;
    const groups = new Map();
    unclaimed.forEach((c) => {
      if (!groups.has(c.guardianId)) groups.set(c.guardianId, { childIds: [], guardianIds: new Set() });
      const g = groups.get(c.guardianId);
      g.childIds.push(c.id);
      g.guardianIds.add(c.guardianId);
      (c.guardianIds || []).forEach((gid) => g.guardianIds.add(gid));
    });
    groups.forEach((group, primaryGuardianId) => {
      const existing = existingFamilies.find((f) => f.primaryGuardianId === primaryGuardianId);
      if (existing) {
        updateRecord(existing.id, {
          childIds: Array.from(new Set((existing.childIds || []).concat(group.childIds))),
          guardianIds: Array.from(new Set((existing.guardianIds || []).concat(Array.from(group.guardianIds)))),
        });
        return;
      }
      const guardian = records.find((r) => r.id === primaryGuardianId);
      const surname = ((guardian && guardian.name) || '').trim().split(/\s+/).slice(-1)[0];
      addRecord({
        id: 'FAM-' + primaryGuardianId, type: 'Family',
        name: surname ? surname + ' Family' : 'Family',
        guardianIds: Array.from(group.guardianIds), childIds: group.childIds,
        primaryGuardianId, parentAppStatus: 'Not invited', invitedAt: null,
      });
    });
  }
  ensureFamiliesForAllChildren();

  /* ---------- scheduled class moves (Class Workspace — S24) ----------
     "Move child" can be given a future effective date. There is no
     scheduler/cron in this static project, so a scheduled move is stored as
     a 'ClassMove' record with status 'Scheduled' and left untouched until
     its effective date arrives — this runs on every load (same precedent as
     ensureFamiliesForAllChildren above) so the child's `room` only changes
     once the date is actually reached, on whichever page the user happens
     to open next, rather than being applied immediately against the
     requested semantics. */
  function applyDueClassMoves() {
    const today = (() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })();
    records.filter((r) => r.type === 'ClassMove' && r.status === 'Scheduled' && r.effectiveDate <= today).forEach((move) => {
      const child = records.find((r) => r.id === move.childId);
      if (child) updateRecord(child.id, { room: move.toClassName });
      updateRecord(move.id, { status: 'Applied', appliedAt: new Date().toISOString() });
    });
  }
  applyDueClassMoves();

  /* ---------- messaging hub (S29) ----------
     Backfills a `conversationId` onto any legacy broadcast Message created
     by the existing family.js/children.js composer (which only ever wrote
     subject/body/recipientGuardianIds/date) so every message — old or new —
     lives in exactly one per-family thread. Runs after
     ensureFamiliesForAllChildren so every guardian already has a Family. */
  function migrateLegacyMessages() {
    records.filter((r) => r.type === 'Message' && !r.conversationId).forEach((msg) => {
      const guardianId = (msg.recipientGuardianIds || [])[0];
      const family = guardianId && records.find((r) => r.type === 'Family' && (r.guardianIds || []).includes(guardianId));
      if (!family) return;
      let conv = records.find((r) => r.type === 'Conversation' && r.kind === 'family' && r.familyId === family.id);
      if (!conv) {
        const child = records.find((r) => r.type === 'Child' && (family.childIds || []).includes(r.id));
        conv = addRecord({ id: 'CONV-' + family.id, type: 'Conversation', kind: 'family', familyId: family.id, childId: child ? child.id : null, createdAt: msg.date + 'T00:00:00.000Z', lastMessageAt: msg.date + 'T00:00:00.000Z' });
      }
      updateRecord(msg.id, { conversationId: conv.id, senderType: msg.senderType || 'Staff', senderId: msg.senderId || 'S-3001', senderName: msg.senderName || 'Nithya', status: msg.status || 'sent', attachments: msg.attachments || [], readBy: msg.readBy || ['S-3001'], createdAt: msg.createdAt || (msg.date + 'T12:00:00.000Z') });
      if (!conv.lastMessageAt || conv.lastMessageAt < msg.date) updateRecord(conv.id, { lastMessageAt: msg.date + 'T12:00:00.000Z' });
    });
  }
  migrateLegacyMessages();

  /** A scheduled message has no real backend to send it later, so — same
      honest pattern as applyDueClassMoves — any 'scheduled' Message whose
      time has arrived is converted to 'sent' the next time any page loads
      this store, rather than pretending a server will deliver it. */
  function processDueScheduledMessages() {
    const now = new Date().toISOString();
    records.filter((r) => r.type === 'Message' && r.status === 'scheduled' && r.scheduledFor && r.scheduledFor <= now).forEach((msg) => {
      updateRecord(msg.id, { status: 'sent', date: msg.scheduledFor.slice(0, 10), createdAt: msg.scheduledFor });
      const conv = records.find((r) => r.type === 'Conversation' && r.id === msg.conversationId);
      if (conv) updateRecord(conv.id, { lastMessageAt: msg.scheduledFor });
    });
  }
  processDueScheduledMessages();

  /** Same honest pattern as processDueScheduledMessages/applyDueClassMoves —
      a 'Scheduled' Announcement whose time has arrived becomes 'Sent' the
      next time any page loads the store (S30). */
  function processDueScheduledAnnouncements() {
    const now = new Date().toISOString();
    records.filter((r) => r.type === 'Announcement' && r.status === 'Scheduled' && r.scheduledFor && r.scheduledFor <= now).forEach((a) => {
      updateRecord(a.id, { status: 'Sent', sentAt: a.scheduledFor, date: a.scheduledFor.slice(0, 10) });
    });
  }
  processDueScheduledAnnouncements();

  /* ---------- admissions pipeline (S07 Admissions) ----------
     'Enquiry' is a wholly new record type — a prospective family only
     becomes a real Child/Guardian once admissions.html hands off to the
     enrolment wizard (S14). Seeded once (guarded the same way as every
     other ensureX helper here) using dates computed relative to "today"
     so the KPI strip and stage-age colouring always look realistic
     regardless of when the demo is opened. */
  function admPad2(n) { return String(n).padStart(2, '0'); }
  function admIsoPlusDays(n) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + admPad2(d.getMonth() + 1) + '-' + admPad2(d.getDate());
  }
  function admIsoPlusMonths(n) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setMonth(d.getMonth() + n, 1);
    return d.getFullYear() + '-' + admPad2(d.getMonth() + 1) + '-' + admPad2(d.getDate());
  }
  function admStamp(dayOffset) { return admIsoPlusDays(dayOffset) + 'T09:00:00.000Z'; }
  function ensureAdmissionsSeed() {
    if (records.some((r) => r.type === 'Enquiry')) return;
    const seed = [
      { id: 'ENQ-1001', childName: 'Zara Ahmed', dob: '2023-04-12', parentName: 'Hina Ahmed', phone: '+91 98200 11122', email: 'hina.ahmed@example.com', program: 'Sunflower Room', preferredStart: admIsoPlusMonths(1), source: 'Website', ownerId: 'S-3001', ownerName: 'Nithya', stage: 'Enquiry', createdOffset: -1, stageOffset: -1, followUpOffset: 2, notes: 'Asked about settling-in sessions.' },
      { id: 'ENQ-1002', childName: 'Dev Patel', dob: '2023-01-05', parentName: 'Riya Patel', phone: '+91 98201 22334', email: 'riya.patel@example.com', program: 'Marigold Room', preferredStart: admIsoPlusMonths(2), source: 'Referral', ownerId: 'S-3001', ownerName: 'Nithya', stage: 'Enquiry', createdOffset: -3, stageOffset: -3, followUpOffset: -1, notes: 'Referred by the Kapoor family.' },
      { id: 'ENQ-1003', childName: 'Ishaan Verma', dob: '2022-11-20', parentName: 'Pooja Verma', phone: '+91 98202 33445', email: 'pooja.verma@example.com', program: 'Daisy Room', preferredStart: admIsoPlusMonths(1), source: 'Walk-in', ownerId: 'S-3006', ownerName: 'Kavya Iyer', stage: 'Tour booked', createdOffset: -6, stageOffset: -2, followUpOffset: 1, notes: 'Tour scheduled for Thursday morning.' },
      { id: 'ENQ-1004', childName: 'Maya Joseph', dob: '2023-03-02', parentName: 'Anu Joseph', phone: '+91 98203 44556', email: 'anu.joseph@example.com', program: 'Sunflower Room', preferredStart: admIsoPlusMonths(3), source: 'Social', ownerId: 'S-3004', ownerName: 'Divya Shah', stage: 'Tour booked', createdOffset: -9, stageOffset: -8, followUpOffset: -2, notes: 'Wants a second tour with grandparents.' },
      { id: 'ENQ-1005', childName: 'Arnav Shetty', dob: '2022-09-18', parentName: 'Kiran Shetty', phone: '+91 98204 55667', email: 'kiran.shetty@example.com', program: 'Daisy Room', preferredStart: admIsoPlusMonths(1), source: 'Event', ownerId: 'S-3001', ownerName: 'Nithya', stage: 'Applied', createdOffset: -14, stageOffset: -4, followUpOffset: 3, notes: 'Application form submitted, awaiting references.' },
      { id: 'ENQ-1006', childName: 'Tara Nair', dob: '2023-05-30', parentName: 'Devika Nair', phone: '+91 98205 66778', email: 'devika.nair@example.com', program: 'Marigold Room', preferredStart: admIsoPlusMonths(2), source: 'Website', ownerId: 'S-3006', ownerName: 'Kavya Iyer', stage: 'Applied', createdOffset: -20, stageOffset: -16, followUpOffset: -5, notes: 'Waiting on immunisation records from parent.' },
      { id: 'ENQ-1007', childName: 'Vivaan Rao', dob: '2022-12-08', parentName: 'Shalini Rao', phone: '+91 98206 77889', email: 'shalini.rao@example.com', program: 'Sunflower Room', preferredStart: admIsoPlusMonths(1), source: 'Referral', ownerId: 'S-3004', ownerName: 'Divya Shah', stage: 'Offer sent', createdOffset: -18, stageOffset: -5, followUpOffset: 2, notes: 'Offer sent — awaiting deposit to confirm the seat.' },
      { id: 'ENQ-1008', childName: 'Diya Chawla', dob: '2023-02-14', parentName: 'Neha Chawla', phone: '+91 98207 88990', email: 'neha.chawla@example.com', program: 'Marigold Room', preferredStart: admIsoPlusMonths(3), source: 'Walk-in', ownerId: 'S-3001', ownerName: 'Nithya', stage: 'Offer sent', createdOffset: -26, stageOffset: -17, followUpOffset: -3, notes: 'Second follow-up call needed — no response yet.' },
      { id: 'ENQ-1009', childName: 'Reyansh Bhatt', dob: '2022-07-21', parentName: 'Komal Bhatt', phone: '+91 98208 99001', email: 'komal.bhatt@example.com', program: 'Daisy Room', preferredStart: admIsoPlusMonths(1), source: 'Event', ownerId: 'S-3006', ownerName: 'Kavya Iyer', stage: 'Enrolled', createdOffset: -40, stageOffset: -3, followUpOffset: null, notes: 'Deposit received, enrolment confirmed.' },
      { id: 'ENQ-1010', childName: 'Sara Khan', dob: '2023-06-02', parentName: 'Farah Khan', phone: '+91 98209 00112', email: 'farah.khan@example.com', program: 'Sunflower Room', preferredStart: admIsoPlusMonths(2), source: 'Website', ownerId: 'S-3004', ownerName: 'Divya Shah', stage: 'Enrolled', createdOffset: -33, stageOffset: -10, followUpOffset: null, notes: 'Starts next term alongside her cousin.' },
      { id: 'ENQ-1011', childName: 'Advait Joshi', dob: '2022-10-09', parentName: 'Mugdha Joshi', phone: '+91 98210 11223', email: 'mugdha.joshi@example.com', program: 'Marigold Room', preferredStart: admIsoPlusDays(10), source: 'Referral', ownerId: 'S-3001', ownerName: 'Nithya', stage: 'Enrolled', createdOffset: -50, stageOffset: -20, followUpOffset: null, notes: 'Sibling of an existing Marigold Room child.' },
      { id: 'ENQ-1012', childName: 'Ira Malhotra', dob: '2023-01-27', parentName: 'Simran Malhotra', phone: '+91 98211 22334', email: 'simran.malhotra@example.com', program: 'Daisy Room', preferredStart: admIsoPlusMonths(1), source: 'Social', ownerId: 'S-3006', ownerName: 'Kavya Iyer', stage: 'Lost', createdOffset: -22, stageOffset: -6, followUpOffset: null, lostReason: 'Chose another school', notes: 'Chose a school closer to their new home.' },
      { id: 'ENQ-1013', childName: 'Kabir Das', dob: '2022-08-16', parentName: 'Ritu Das', phone: '+91 98212 33445', email: 'ritu.das@example.com', program: 'Sunflower Room', preferredStart: admIsoPlusMonths(2), source: 'Walk-in', ownerId: 'S-3004', ownerName: 'Divya Shah', stage: 'Lost', createdOffset: -31, stageOffset: -9, followUpOffset: null, lostReason: 'Fees', notes: 'Budget did not align with our fee structure.' },
      { id: 'ENQ-1014', childName: 'Anika Sinha', dob: '2023-07-11', parentName: 'Rashmi Sinha', phone: '+91 98213 44556', email: 'rashmi.sinha@example.com', program: 'Marigold Room', preferredStart: admIsoPlusMonths(1), source: 'Website', ownerId: 'S-3001', ownerName: 'Nithya', stage: 'Enquiry', createdOffset: 0, stageOffset: 0, followUpOffset: 4, notes: 'Submitted the website enquiry form this morning.' },
      { id: 'ENQ-1015', childName: 'Yusuf Qureshi', dob: '2022-06-25', parentName: 'Ayesha Qureshi', phone: '+91 98214 55667', email: 'ayesha.qureshi@example.com', program: 'Daisy Room', preferredStart: admIsoPlusMonths(2), source: 'Other', ownerId: 'S-3006', ownerName: 'Kavya Iyer', stage: 'Applied', createdOffset: -11, stageOffset: -15, followUpOffset: -4, notes: 'References received — ready for a decision.' },
    ];
    seed.forEach((e) => {
      addRecord({
        id: e.id, type: 'Enquiry',
        childName: e.childName, dob: e.dob,
        parentName: e.parentName, phone: e.phone, email: e.email,
        program: e.program, preferredStart: e.preferredStart, source: e.source,
        ownerId: e.ownerId, ownerName: e.ownerName,
        stage: e.stage,
        createdAt: admStamp(e.createdOffset),
        stageEnteredAt: admStamp(e.stageOffset),
        nextFollowUp: e.followUpOffset == null ? null : admIsoPlusDays(e.followUpOffset),
        notes: e.notes || '',
        lostReason: e.lostReason || null,
        lostNote: e.lostNote || null,
        convertedChildId: null,
        history: [{ from: null, to: e.stage, at: admStamp(e.createdOffset), actor: e.ownerName }],
      });
    });
  }
  ensureAdmissionsSeed();

  /* ---------- tour scheduling (S06 School Tours) ----------
     'TourSlot' (a bookable time slot generated from a recurring pattern)
     and 'TourBooking' (one family's reservation against a slot, linked to
     its Enquiry) are wholly new record types — same addRecord/updateRecord
     convention as everything else. Seeded once, guarded the same way as
     ensureAdmissionsSeed, and built entirely from enquiries already seeded
     above rather than inventing new people. Dates are computed relative to
     "today" by walking actual weekdays (not fixed offsets) so the seed is
     correct regardless of what day the demo happens to be opened. */
  function tourPad2(n) { return String(n).padStart(2, '0'); }
  function tourIsoPlusDays(n) {
    const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n);
    return d.getFullYear() + '-' + tourPad2(d.getMonth() + 1) + '-' + tourPad2(d.getDate());
  }
  /** Offset (in days from today) of the Nth occurrence of `targetDow`
      (0=Sun..6=Sat); n>0 walks forward, n<0 walks backward. */
  function tourNthWeekdayOffset(targetDow, n) {
    const step = n >= 0 ? 1 : -1;
    const target = Math.abs(n);
    let count = 0, offset = 0;
    while (count < target) {
      offset += step;
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset);
      if (d.getDay() === targetDow) count++;
    }
    return offset;
  }
  function ensureTourSeed() {
    if (records.some((r) => r.type === 'TourSlot')) return;
    const GUIDE_A = { id: 'S-3003', name: 'Meera Fernandes' };
    const GUIDE_B = { id: 'S-3005', name: 'Arjun Mehta' };
    const SLOT_TIMES = [['09:00', '09:30'], ['09:45', '10:15']];

    // Generate slots for every Tue/Thu/Sat from 3 weeks ago to 3 weeks ahead.
    for (let offset = -21; offset <= 21; offset++) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset);
      const dow = d.getDay();
      if (dow !== 2 && dow !== 4 && dow !== 6) continue;
      const dateISO = tourIsoPlusDays(offset);
      const guide = dow === 6 ? GUIDE_B : GUIDE_A;
      SLOT_TIMES.forEach(([start, end]) => {
        addRecord({
          id: 'TSLOT-' + dateISO + '-' + start.replace(':', ''), type: 'TourSlot',
          date: dateISO, startTime: start, endTime: end,
          guideId: guide.id, guideName: guide.name, maxFamilies: 3,
        });
      });
    }
    function slotAt(dow, n, timeIdx) {
      const offset = tourNthWeekdayOffset(dow, n);
      const dateISO = tourIsoPlusDays(offset);
      const [start, end] = SLOT_TIMES[timeIdx];
      return { id: 'TSLOT-' + dateISO + '-' + start.replace(':', ''), dateISO, start, end, guide: dow === 6 ? GUIDE_B : GUIDE_A };
    }
    function seedBooking(bookingId, slot, enquiryId, status, createdOffsetDays) {
      const enquiry = records.find((r) => r.id === enquiryId);
      if (!enquiry) return;
      const nowIso = tourIsoPlusDays(createdOffsetDays) + 'T10:00:00.000Z';
      addRecord({
        id: bookingId, type: 'TourBooking',
        slotId: slot.id, enquiryId, childName: enquiry.childName, parentName: enquiry.parentName,
        date: slot.dateISO, startTime: slot.start, endTime: slot.end,
        guideId: slot.guide.id, guideName: slot.guide.name,
        status, notes: '', noShowFollowUpCreated: status === 'No-show',
        createdAt: nowIso,
        history: [{ action: 'Booked', at: nowIso, actor: enquiry.ownerName || 'Nithya' }]
          .concat(status !== 'Booked' ? [{ action: status, at: nowIso, actor: enquiry.ownerName || 'Nithya' }] : []),
      });
    }
    // Upcoming, currently-booked tours (match ENQ-1003/1004's 'Tour booked' stage).
    seedBooking('TBK-1001', slotAt(2, 1, 0), 'ENQ-1003', 'Booked', -6);
    seedBooking('TBK-1002', slotAt(4, 1, 1), 'ENQ-1004', 'Booked', -9);
    // Past tours for applicants who have since moved further along the pipeline.
    seedBooking('TBK-1003', slotAt(2, -2, 0), 'ENQ-1005', 'Attended', -16);
    seedBooking('TBK-1004', slotAt(4, -2, 1), 'ENQ-1007', 'Attended', -20);
    seedBooking('TBK-1005', slotAt(6, -1, 0), 'ENQ-1006', 'No-show', -22);
    seedBooking('TBK-1006', slotAt(4, -3, 1), 'ENQ-1012', 'Cancelled', -24);
  }
  ensureTourSeed();

  /* ---------- waitlist (S17 Waitlist Management) ----------
     A waitlisted family is already represented as a 'Child' record with
     status 'Waitlisted' (see enroll.js's own comment acknowledging this is
     a status flag, not a tracked queue) — rather than inventing a parallel
     record type, this adds a `waitlist` object onto that same Child record
     (position, priority flags, notes, requested start, history) so every
     existing consumer of Child records is unaffected and nothing needs
     migrating. `waitlist.active` (not `child.status`) is what the Waitlist
     page actually queries by, so offering/removing a place never has to
     touch the status vocabulary children.js and enroll.js already rely on. */
  function ensureWaitlistSeed() {
    if (records.some((r) => r.type === 'Child' && r.waitlist)) return;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    function daysAgoISO(n) { const d = new Date(today); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + tourPad2(d.getMonth() + 1) + '-' + tourPad2(d.getDate()); }
    function monthsAheadISO(n) { const d = new Date(today); d.setMonth(d.getMonth() + n, 1); return d.getFullYear() + '-' + tourPad2(d.getMonth() + 1) + '-' + tourPad2(d.getDate()); }
    const seed = [
      { room: 'Sunflower Room', name: 'Ibrahim Siddiqui', dob: '2023-05-14', guardian: 'Zoya Siddiqui', addedDaysAgo: 40, requestedIn: 1, priority: { sibling: true, staffChild: false, returning: false }, notes: 'Older sibling already in Sunflower Room.' },
      { room: 'Sunflower Room', name: 'Mira Kulkarni', dob: '2023-08-02', guardian: 'Anjali Kulkarni', addedDaysAgo: 25, requestedIn: 2, priority: {}, notes: '' },
      { room: 'Marigold Room', name: 'Veer Chauhan', dob: '2022-10-20', guardian: 'Pallavi Chauhan', addedDaysAgo: 55, requestedIn: 1, priority: { sibling: false, staffChild: true, returning: false }, notes: 'Parent is Daisy Room staff.' },
      { room: 'Marigold Room', name: 'Saanvi Thakur', dob: '2022-12-05', guardian: 'Rekha Thakur', addedDaysAgo: 18, requestedIn: 2, priority: {}, notes: 'Flexible on exact start date.' },
      { room: 'Marigold Room', name: 'Devansh Rao', dob: '2023-01-30', guardian: 'Lakshmi Rao', addedDaysAgo: 8, requestedIn: 3, priority: { sibling: false, staffChild: false, returning: true }, notes: 'Previously enrolled, family relocated and is now back.' },
      { room: 'Daisy Room', name: 'Alia Fernandez', dob: '2020-03-11', guardian: 'Carlos Fernandez', addedDaysAgo: 30, requestedIn: 1, priority: {}, notes: '' },
    ];
    const byRoom = {};
    seed.forEach((s, i) => {
      byRoom[s.room] = (byRoom[s.room] || 0) + 1;
      const position = byRoom[s.room];
      const n = 1007 + i;
      const childId = 'C-' + n; const guardianId = 'G-' + (2000 + n);
      const dateAdded = daysAgoISO(s.addedDaysAgo);
      addRecord({
        id: guardianId, type: 'Guardian', name: s.guardian, relation: 'Parent of ' + s.name, status: 'Active',
        contact: s.guardian.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, '.') + '@example.com',
      });
      addRecord({
        id: childId, type: 'Child', name: s.name, room: s.room, status: 'Waitlisted', guardianId,
        dob: s.dob, alerts: [], authorizedPickups: [],
        waitlist: {
          active: true, position, priority: s.priority, notes: s.notes,
          requestedStart: monthsAheadISO(s.requestedIn), dateAdded,
          history: [{ action: 'Added to waitlist', at: dateAdded + 'T09:00:00.000Z', actor: 'Nithya', reason: null }],
          removedReason: null, removedAt: null, offer: null, offerSentAt: null,
        },
      });
    });
  }
  ensureWaitlistSeed();

  /* ---------- app settings (school profile, admin profile, academic year, preferences) ----------
     Single settings object — the de facto "S58 Settings" store for this demo,
     since no dedicated settings page/backend exists yet. */
  const SETTINGS_KEY = 'ps_app_settings';
  function getSettings() {
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveSettings(partial) {
    const next = Object.assign({}, getSettings(), partial);
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(next)); } catch (e) { /* storage unavailable */ }
    return next;
  }

  function normalize(str) {
    return String(str || '').toLowerCase();
  }

  function secondaryLine(record) {
    if (record.type === 'Child') return `${record.room} · ${record.status}`;
    if (record.type === 'Class') return [record.ageGroup, record.teacherName].filter(Boolean).join(' · ');
    if (record.type === 'Guardian') return record.relation;
    return record.relation;
  }

  function search(query) {
    const q = normalize(query).trim();
    if (!q) return [];
    return records.filter((r) => {
      const haystack = normalize([r.id, r.name, r.type, r.room, r.relation, r.status].filter(Boolean).join(' '));
      return haystack.includes(q);
    });
  }

  function getById(id) {
    return records.find((r) => normalize(r.id) === normalize(id)) || null;
  }

  /** Resolves the day's menu from the weekly MenuTemplate by weekday — not a
      per-date record, so "today" never goes stale. Returns null on days with
      no scheduled menu (weekends). */
  function getMenuForDate(dateISO) {
    const dow = new Date(dateISO + 'T00:00:00').getDay();
    return records.find((r) => r.type === 'MenuTemplate' && r.dayOfWeek === dow) || null;
  }

  window.PlayStore = {
    records,
    search,
    getById,
    secondaryLine,
    addRecord,
    updateRecord,
    removeRecord,
    getByType,
    getSettings,
    saveSettings,
    getMenuForDate,
  };
})();
