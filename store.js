/* ==========================================================================
   PLAY SCHOOL — shared data store
   Minimal in-memory dataset + search used across app pages (dashboard,
   record pages, 404 global search). No backend — static demo data only.
   ========================================================================== */
(function () {
  'use strict';

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
