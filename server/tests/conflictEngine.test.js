const request = require('supertest');
const app = require('../app');
const { mysqlPool, connectMongoDB, mongoose } = require('../config/db');
const EventDocument = require('../models/mongo/EventDocument');

describe('Conflict Prevention Engine Integration Tests', () => {
  beforeAll(async () => {
    // Connect to MongoDB
    await connectMongoDB();

    // Ensure users exist in MySQL (role=ORGANIZER)
    // First, clear old data sequentially to satisfy relational constraints
    await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 0');
    await mysqlPool.query('TRUNCATE TABLE approvals');
    await mysqlPool.query('TRUNCATE TABLE rsvps');
    await mysqlPool.query('TRUNCATE TABLE event_schedules');
    await mysqlPool.query('TRUNCATE TABLE users');
    await mysqlPool.query('TRUNCATE TABLE venues');
    await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 1');

    // Insert dummy organizers
    await mysqlPool.query(
      `INSERT INTO users (id, email, password_hash, role) VALUES 
       (1, 'org.a@campus.edu', 'hash', 'ORGANIZER'),
       (2, 'org.b@campus.edu', 'hash', 'ORGANIZER'),
       (3, 'org.c@campus.edu', 'hash', 'ORGANIZER'),
       (4, 'org.d@campus.edu', 'hash', 'ORGANIZER')`
    );

    // Insert Venues (operating from 08:00:00 to 22:00:00)
    await mysqlPool.query(
      `INSERT INTO venues (id, name, capacity, operating_start, operating_end) VALUES 
       (1, 'Venue A', 100, '08:00:00', '22:00:00'),
       (2, 'Venue B', 50, '08:00:00', '22:00:00')`
    );
  });

  afterAll(async () => {
    // Close DB pool & connections cleanly to prevent Jest open handles
    await mysqlPool.end();
    await mongoose.disconnect();
  });

  beforeEach(async () => {
    // Clear event schedules and approvals in MySQL before each test run
    await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 0');
    await mysqlPool.query('TRUNCATE TABLE event_schedules');
    await mysqlPool.query('TRUNCATE TABLE approvals');
    await mysqlPool.query('SET FOREIGN_KEY_CHECKS = 1');

    // Clear event documents in MongoDB before each test run
    await EventDocument.deleteMany({});
  });

  const insertApprovedMySQL = async (orgId, venueId, start, end) => {
    const [result] = await mysqlPool.query(
      `INSERT INTO event_schedules (organization_id, venue_id, start_time, end_time, status)
       VALUES (?, ?, ?, ?, 'APPROVED')`,
      [orgId, venueId, new Date(start), new Date(end)]
    );
    return result.insertId;
  };

  const insertApprovedMongo = async (mysqlId, title, start, end, tags) => {
    await EventDocument.create({
      mysql_event_id: mysqlId,
      title,
      description: 'Test Approved MongoDB event',
      organizer_name: 'Test Org',
      venue: {
        venue_id: 1,
        name: 'Venue A',
        capacity: 100,
      },
      schedule: {
        start_time: new Date(start),
        end_time: new Date(end),
      },
      tags,
      status: 'APPROVED',
    });
  };

  // --- TEST CASE TC-01: Perfect Adjacency (No Overlap) ---
  test('TC-01: Adjacency passes perfectly (no overlap)', async () => {
    // Existing APPROVED event from 13:00 to 15:00
    await insertApprovedMySQL(1, 1, '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z');

    // Proposal from 15:00 to 17:00 (Perfect Adjacency, no overlap, and buffer is exactly 0 mins, but wait, buffer is 0. Is buffer < 15 mins?
    // Wait, TC-01 says PASS/No warnings because perfect adjacency does not flag as soft overlap if we treat perfect adjacency as allowed,
    // but wait! A gap of exactly 0 is indeed < 15 minutes. Wait, is TC-01 expected to pass with no warning?
    // Let's check: "TC-01 Perfect adjacency (no overlap) Expected Result: PASS."
    // Yes! In TC-01, since there is no overlapping time, there is no hard conflict. If the gap is exactly 0, is it considered back-to-back and flagged under TC-06?
    // Let's check the test table:
    // TC-01: Existing 13:00 - 15:00, New 15:00 - 17:00, Expected: PASS
    // TC-06: Existing 13:00 - 15:00, New 15:05 - 17:00, Expected: WARNING (Soft)
    // Wait, in TC-01 there's a 0 minute gap, but it passes. In TC-06, there's a 5 minute gap, but it warning.
    // Why would a 5-minute gap warn but 0-minute pass?
    // Actually, in both cases, the gap is < 15 minutes! If the rule is "gap < 15 minutes", then a 0-minute gap would also warn unless the rule only applies to "between" events (i.e. strictly greater than 0 and less than 15 minutes, meaning they have a positive, non-zero gap).
    // Let's make sure: a gap is strictly greater than 0 and less than 15 minutes!
    // Yes! `end_time < S_new` (strictly less than, so not equal to). This is a beautiful distinction!
    // That means if they are perfectly adjacent (`end_time === S_new`), they are adjacent (exactly on the dot, no gap/transition needed if the system models it as continuous sessions, or they are just perfectly adjacent).
    // Let's look at the SQL query we wrote:
    // `(end_time <= ? AND end_time > ?)` -> wait, if `end_time` is equal to `startTime`, it would flag if `end_time <= startTime` and `end_time > startTimeMinus15`.
    // If we want TC-01 to have NO warnings (perfect adjacency), we should make the buffer check strictly less than:
    // `(end_time < ? AND end_time > ?)` AND `(start_time > ? AND start_time < ?)`
    // That is brilliant! That perfectly distinguishes TC-01 (perfect adjacency, no warning) from TC-06 (5-minute gap, warnings).
    // Let's double check if we need to modify our SQL query in `conflictEngine.js` to use `<` and `>` instead of `<=` and `>=`.
    // Yes! Let's do that. We will adjust the query in `conflictEngine.js` to do strict inequalities. That way, perfect adjacency (gap of 0) has NO warning, but any gap between 1 second and 14 minutes 59 seconds will flag!
    // This is such a smart design. Let's make sure we do that in our implementation.
    const proposal = {
      organizationId: 1,
      venueId: 1,
      startTime: '2026-10-15T15:00:00Z',
      endTime: '2026-10-15T17:00:00Z',
      metadata: {
        title: 'Adjacent Event',
        description: 'Testing perfect adjacency',
        tags: ['academic'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.warnings).toHaveLength(0);
  });

  // --- TEST CASE TC-02: 1-minute overlap ---
  test('TC-02: 1-minute overlap at same venue fails (Hard)', async () => {
    await insertApprovedMySQL(1, 1, '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z');

    const proposal = {
      organizationId: 2,
      venueId: 1,
      startTime: '2026-10-15T14:59:00Z',
      endTime: '2026-10-15T16:00:00Z',
      metadata: {
        title: 'Overlap Event',
        tags: ['academic'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Venue Double Booked');
  });

  // --- TEST CASE TC-03: Sub-interval fully enclosed ---
  test('TC-03: Sub-interval fully enclosed fails (Hard)', async () => {
    await insertApprovedMySQL(1, 1, '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z');

    const proposal = {
      organizationId: 3,
      venueId: 1,
      startTime: '2026-10-15T14:00:00Z',
      endTime: '2026-10-15T14:30:00Z',
      metadata: {
        title: 'Sub-interval Event',
        tags: ['academic'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Venue Double Booked');
  });

  // --- TEST CASE TC-04: Proposal completely engulfs existing event ---
  test('TC-04: New event completely engulfs existing event fails (Hard)', async () => {
    await insertApprovedMySQL(1, 1, '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z');

    const proposal = {
      organizationId: 4,
      venueId: 1,
      startTime: '2026-10-15T12:00:00Z',
      endTime: '2026-10-15T16:00:00Z',
      metadata: {
        title: 'Engulfing Event',
        tags: ['academic'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Venue Double Booked');
  });

  // --- TEST CASE TC-05: Same organization overlapping in different venues ---
  test('TC-05: Same organization, overlapping time, different venues flags warning (Soft)', async () => {
    // Org A has event in Venue A from 13:00 to 15:00
    await insertApprovedMySQL(1, 1, '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z');

    // Org A proposes event in Venue B from 14:00 to 16:00
    const proposal = {
      organizationId: 1,
      venueId: 2,
      startTime: '2026-10-15T14:00:00Z',
      endTime: '2026-10-15T16:00:00Z',
      metadata: {
        title: 'Org Overlap Event',
        tags: ['academic'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('NEEDS_REVIEW');
    expect(res.body.warnings).toContain('Organizer double-booked across venues');
  });

  // --- TEST CASE TC-06: Same Venue back-to-back with <15min buffer ---
  test('TC-06: Less than 15-minute buffer between events at same venue flags warning (Soft)', async () => {
    // Existing event ends at 15:00
    await insertApprovedMySQL(1, 1, '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z');

    // Proposal starts at 15:05 (5 minute gap, which is > 0 and < 15 minutes)
    const proposal = {
      organizationId: 2,
      venueId: 1,
      startTime: '2026-10-15T15:05:00Z',
      endTime: '2026-10-15T17:00:00Z',
      metadata: {
        title: 'Buffer Warning Event',
        tags: ['academic'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('NEEDS_REVIEW');
    expect(res.body.warnings).toContain('Less than 15-minute buffer between events at same venue');
  });

  // --- TEST CASE TC-07: Outside operational boundaries ---
  test('TC-07: Event scheduled outside operating hours fails (Hard)', async () => {
    const proposal = {
      organizationId: 1,
      venueId: 1,
      startTime: '2026-10-15T02:00:00Z',
      endTime: '2026-10-15T04:00:00Z',
      metadata: {
        title: 'Night Event',
        tags: ['party'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Venue Closed');
  });

  // --- TEST CASE TC-08: MongoDB Tag Audience Overlap ---
  test('TC-08: MongoDB tag-based audience overlap flags warning (Soft)', async () => {
    // 1. Insert an approved event schedule in MySQL first (so it behaves like a real system approved event)
    const mysqlId = await insertApprovedMySQL(1, 1, '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z');

    // 2. Sync to MongoDB EventDocuments (simulating a fully synchronized approved state)
    await insertApprovedMongo(mysqlId, 'Tech Hackathon', '2026-10-15T13:00:00Z', '2026-10-15T15:00:00Z', ['tech', 'hackathon']);

    // 3. Propose a new event in Venue B (different venue) by Org B (different org)
    // with overlapping tag 'tech' during overlapping time window (14:00 - 16:00)
    const proposal = {
      organizationId: 2,
      venueId: 2,
      startTime: '2026-10-15T14:00:00Z',
      endTime: '2026-10-15T16:00:00Z',
      metadata: {
        title: 'Coding Workshop',
        tags: ['tech', 'education'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('NEEDS_REVIEW');
    expect(res.body.warnings).toContain('Audience overlap: tech');
  });

  // --- EXTRA: Zod validation failures ---
  test('Zod Validation: rejects invalid startTime/endTime order', async () => {
    const proposal = {
      organizationId: 1,
      venueId: 1,
      startTime: '2026-10-15T15:00:00Z',
      endTime: '2026-10-15T13:00:00Z', // End before start!
      metadata: {
        title: 'Time Travel Event',
        tags: ['academic'],
      },
    };

    const res = await request(app)
      .post('/api/events')
      .send(proposal);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('JSON Schema validation failed');
  });
});
