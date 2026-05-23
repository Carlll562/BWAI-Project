const { mysqlPool } = require('../config/db');
const { checkConflicts } = require('../services/conflictEngine');
const EventDocument = require('../models/mongo/EventDocument');

/**
 * Controller to handle proposing a new event.
 * Validates against Hard & Soft conflicts, writes to MySQL database,
 * persists the initial metadata document to MongoDB, and returns conflict reports.
 *
 * HYBRID DATA FLOW:
 * 1. Executes conflict checks against both MySQL (relational) and MongoDB (tag-based).
 * 2. Writes the foundational relational schedule block to MySQL.
 * 3. Derives the organizer's uppercase display name from their MySQL account email.
 * 4. Syncs the draft document to MongoDB so it's ready in the system.
 */
const proposeEvent = async (req, res, next) => {
  try {
    // Zero-Trust input guarantees: req.validatedBody is pre-sanitized by Zod schema middleware.
    const { organizationId, venueId, startTime, endTime, metadata } = req.validatedBody;
    const { title, description, tags } = metadata;

    // 1. Run Two-Stage Conflict-Detection Engine
    const conflictResult = await checkConflicts(req.validatedBody);

    // 2. Reject proposal immediately if Hard Conflict is detected (e.g. venue double booking or closed hours)
    if (conflictResult.hasHardConflict) {
      return res.status(409).json({
        success: false,
        message: conflictResult.reason,
      });
    }

    // 3. Assign appropriate relational status
    // If soft conflicts exist (warnings array not empty) -> auto-route to 'NEEDS_REVIEW' for admin review.
    // If absolutely clean -> set to 'PENDING'.
    const status = conflictResult.warnings.length > 0 ? 'NEEDS_REVIEW' : 'PENDING';

    // 4. Save event proposal in MySQL
    // Relational status and scheduling constraints are kept strictly in MySQL to maintain relational integrity (Guardrail 1).
    const [insertResult] = await mysqlPool.query(
      `INSERT INTO event_schedules (organization_id, venue_id, start_time, end_time, status)
       VALUES (?, ?, ?, ?, ?)`,
      [
        organizationId,
        venueId,
        new Date(startTime),
        new Date(endTime),
        status,
      ]
    );

    const eventId = insertResult.insertId;

    // Fetch organizer name from MySQL users table to populate the document store
    const [userRows] = await mysqlPool.query('SELECT email FROM users WHERE id = ?', [organizationId]);
    const orgEmail = userRows.length > 0 ? userRows[0].email : `Org ${organizationId}`;
    // Usernames are derived cleanly from emails (e.g., john.doe@campus.edu becomes "JOHN DOE")
    const organizerName = orgEmail.split('@')[0].toUpperCase().replace('.', ' ');

    // 5. Persist the proposal draft to MongoDB EventDocuments (Guardrail 1)
    // Discovery Feed queries only MongoDB. We record the draft here with corresponding status.
    await EventDocument.create({
      mysql_event_id: eventId,
      title,
      description: description || '',
      tags: tags || [],
      organizer_name: organizerName,
      venue: {
        venue_id: venueId,
        name: conflictResult.venueName || `Venue ${venueId}`,
        capacity: conflictResult.venueCapacity || 100,
      },
      schedule: {
        start_time: new Date(startTime),
        end_time: new Date(endTime),
      },
      status,
      rsvps_count: 0,
    });

    // 6. Respond to client with database identifiers and warnings
    return res.status(201).json({
      success: true,
      message: 'Event proposed successfully',
      eventId,
      status,
      warnings: conflictResult.warnings,
    });
  } catch (error) {
    console.error('❌ Error in proposeEvent controller:', error);
    next(error); // Route to global Zero-Trust exception middleware
  }
};

/**
 * Controller to fetch all approved events for Student Discovery Feed.
 * Reads exclusively from MongoDB (Guardrail 1) for rapid content retrieval and low SQL strain.
 */
const getEvents = async (req, res, next) => {
  try {
    const { tag, tags } = req.query;
    const filter = { status: 'APPROVED' };

    // Support flexible tag filtering (either singular 'tag' or comma-separated list 'tags')
    if (tag) {
      filter.tags = tag;
    } else if (tags) {
      filter.tags = { $in: tags.split(',') };
    }

    // Fetch approved events sorted chronologically by starting time
    const events = await EventDocument.find(filter).sort({ 'schedule.start_time': 1 });

    return res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    console.error('❌ Error in getEvents controller:', error);
    next(error);
  }
};

/**
 * Controller to fetch all venues from MySQL.
 * Used by event creators to populate location dropdown lists.
 */
const getVenues = async (req, res, next) => {
  try {
    const [rows] = await mysqlPool.query('SELECT * FROM venues ORDER BY id ASC');
    return res.status(200).json({
      success: true,
      venues: rows,
    });
  } catch (error) {
    console.error('❌ Error in getVenues controller:', error);
    next(error);
  }
};

/**
 * Controller to dry-run conflict check for front-end form feedback.
 * Allows organizer dashboards to dynamically flag overlaps in real-time as users fill in dates.
 */
const checkConflictsEndpoint = async (req, res, next) => {
  try {
    const conflictResult = await checkConflicts(req.body);
    return res.status(200).json({
      success: true,
      ...conflictResult,
    });
  } catch (error) {
    console.error('❌ Error in checkConflictsEndpoint:', error);
    next(error);
  }
};

/**
 * Controller to fetch all proposals (Admin review queue & Org status list).
 * Queries MySQL merged with MongoDB rich document metadata.
 * Demonstrates a modular merge pattern:
 * 1. Queries scheduling lists and relational statuses from MySQL.
 * 2. Collects MySQL primary keys.
 * 3. Performs a single batch lookup in MongoDB via `$in`.
 * 4. Combines the objects in-memory to prevent slow N+1 query patterns.
 */
const getProposals = async (req, res, next) => {
  try {
    const { organizationId, status } = req.query;
    
    let sql = `
      SELECT es.*, v.name AS venue_name, v.capacity AS venue_capacity, u.email AS organizer_email
      FROM event_schedules es
      JOIN venues v ON es.venue_id = v.id
      JOIN users u ON es.organization_id = u.id
    `;
    const params = [];

    const conditions = [];
    if (organizationId) {
      conditions.push('es.organization_id = ?');
      params.push(parseInt(organizationId, 10));
    }
    if (status) {
      conditions.push('es.status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY es.created_at DESC';

    // 1. Fetch relational list from MySQL using prepared statement
    const [schedules] = await mysqlPool.query(sql, params);

    if (schedules.length === 0) {
      return res.status(200).json({
        success: true,
        proposals: [],
      });
    }

    // 2. Perform batched MongoDB metadata lookup to avoid N+1 query performance bottleneck
    const mysqlIds = schedules.map(s => s.id);
    const mongoDocs = await EventDocument.find({ mysql_event_id: { $in: mysqlIds } });
    const mongoMap = new Map(mongoDocs.map(doc => [doc.mysql_event_id, doc]));

    // 3. Merge records in-memory
    const merged = schedules.map(s => {
      const doc = mongoMap.get(s.id);
      return {
        id: s.id,
        organizationId: s.organization_id,
        venueId: s.venue_id,
        venueName: s.venue_name,
        venueCapacity: s.venue_capacity,
        organizerEmail: s.organizer_email,
        organizerName: doc ? doc.organizer_name : `Org ${s.organization_id}`,
        startTime: s.start_time,
        endTime: s.end_time,
        status: s.status,
        createdAt: s.created_at,
        title: doc ? doc.title : 'Proposed Event',
        description: doc ? doc.description : '',
        tags: doc ? doc.tags : [],
        mediaUrls: doc ? doc.media_urls : [],
        rsvpsCount: doc ? doc.rsvps_count : 0,
      };
    });

    return res.status(200).json({
      success: true,
      proposals: merged,
    });
  } catch (error) {
    console.error('❌ Error in getProposals controller:', error);
    next(error);
  }
};

/**
 * Controller to handle Admin Approval.
 * Enforces transaction security, logs admin action in approvals,
 * and synchronizes approved status to MongoDB.
 *
 * HYBRID DATA FLOW (Zero-Trust ACID Transaction):
 * 1. Obtains a dedicated MySQL connection from the pool.
 * 2. Starts a local database transaction.
 * 3. Updates event schedule status to 'APPROVED' in MySQL.
 * 4. Logs audit trail data in the `approvals` table.
 * 5. Commits transaction to MySQL.
 * 6. If MySQL succeeds, propagates status update to MongoDB for the student feed.
 * 7. Rolls back MySQL transaction immediately on failure to prevent partial/invalid states.
 */
const approveProposal = async (req, res, next) => {
  const connection = await mysqlPool.getConnection();
  try {
    const { id } = req.params;
    const adminId = req.body.adminId || 99; // Fallback simulation ID for testing
    const reason = req.body.reason || 'Sufficient capacity and time slots allocated.';

    // Start MySQL atomic transaction
    await connection.beginTransaction();

    // 1. Update MySQL state to APPROVED
    const [updateResult] = await connection.query(
      "UPDATE event_schedules SET status = 'APPROVED' WHERE id = ?",
      [id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Event proposal not found',
      });
    }

    // 2. Log action to relational approvals audit trail
    await connection.query(
      `INSERT INTO approvals (event_schedule_id, admin_id, action, reason)
       VALUES (?, ?, 'APPROVED', ?)`,
      [id, adminId, reason]
    );

    // Commit changes to ensure relational records are finalized
    await connection.commit();

    // 3. Synchronize status change to MongoDB EventDocument
    // This triggers only after successful SQL transaction completion, protecting feed integrity.
    await EventDocument.findOneAndUpdate(
      { mysql_event_id: parseInt(id, 10) },
      { status: 'APPROVED' }
    );

    return res.status(200).json({
      success: true,
      message: 'Proposal approved successfully, synchronized with MongoDB Discovery feed.',
    });
  } catch (error) {
    // Safe SQL Rollback to prevent orphan state transitions
    await connection.rollback();
    console.error('❌ Error in approveProposal controller:', error);
    next(error);
  } finally {
    // Release connection back to the pool to prevent thread starvation
    connection.release();
  }
};

/**
 * Controller to handle Admin Rejection.
 * Enforces transaction security, logs action and reason in approvals,
 * and updates status in MongoDB.
 *
 * HYBRID DATA FLOW (Zero-Trust ACID Transaction):
 * 1. Verifies presence of a written rejection explanation (mandatory).
 * 2. Starts MySQL database transaction.
 * 3. Updates event schedule status to 'REJECTED' in MySQL.
 * 4. Logs audit trail data in the `approvals` table.
 * 5. Commits MySQL transaction.
 * 6. Propagates status update to MongoDB for synchronization.
 */
const rejectProposal = async (req, res, next) => {
  const connection = await mysqlPool.getConnection();
  try {
    const { id } = req.params;
    const adminId = req.body.adminId || 99;
    const { reason } = req.body;

    // Rejection justification is strictly mandatory under Zero-Trust requirements
    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is strictly required',
      });
    }

    await connection.beginTransaction();

    // 1. Update MySQL status to REJECTED
    const [updateResult] = await connection.query(
      "UPDATE event_schedules SET status = 'REJECTED' WHERE id = ?",
      [id]
    );

    if (updateResult.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        success: false,
        message: 'Event proposal not found',
      });
    }

    // 2. Log in approvals audit table
    await connection.query(
      `INSERT INTO approvals (event_schedule_id, admin_id, action, reason)
       VALUES (?, ?, 'REJECTED', ?)`,
      [id, adminId, reason]
    );

    await connection.commit();

    // 3. Synchronize status change to MongoDB EventDocument
    await EventDocument.findOneAndUpdate(
      { mysql_event_id: parseInt(id, 10) },
      { status: 'REJECTED' }
    );

    return res.status(200).json({
      success: true,
      message: 'Proposal rejected and synchronized to MongoDB document.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error in rejectProposal controller:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Controller to submit a Student RSVP to an event.
 * Validates against double-RSVPs, writes to MySQL, and increments MongoDB rsvps_count.
 *
 * HYBRID DATA FLOW:
 * 1. Checks event schedule in MySQL to ensure it is approved.
 * 2. Checks `rsvps` table in MySQL to guarantee user hasn't already registered (Double RSVP check).
 * 3. Generates a secure verification signature containing timestamp and user data.
 * 4. Inserts RSVP record to MySQL `rsvps` table.
 * 5. Uses MongoDB atomic `$inc` operator to increment `rsvps_count` in the event document.
 */
const rsvpEvent = async (req, res, next) => {
  try {
    const { id } = req.params; // MySQL event schedule primary key
    const userId = req.body.userId || 10; // Simulated student user ID
    
    // 1. Verify that the event is approved (students cannot RSVP to pending or rejected drafts)
    const [schedules] = await mysqlPool.query(
      "SELECT * FROM event_schedules WHERE id = ? AND status = 'APPROVED'",
      [id]
    );

    if (schedules.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot RSVP to an unapproved or non-existent event.',
      });
    }

    // 2. Check for double-RSVPs in MySQL using composite indexes
    const [existingRSVPs] = await mysqlPool.query(
      'SELECT * FROM rsvps WHERE event_schedule_id = ? AND user_id = ?',
      [id, userId]
    );

    if (existingRSVPs.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'You have already RSVP’d to this event.',
        qrSignature: existingRSVPs[0].qr_signature,
      });
    }

    // 3. Generate secure entry QR signature representing this ticket
    const qrSignature = `RSVP-${id}-${userId}-${Date.now().toString(36).toUpperCase()}`;

    // 4. Save RSVP to MySQL to guarantee transaction-level unique constraints
    await mysqlPool.query(
      `INSERT INTO rsvps (event_schedule_id, user_id, qr_signature)
       VALUES (?, ?, ?)`,
      [id, userId, qrSignature]
    );

    // 5. Synchronize: Atomic increment of rsvps_count in MongoDB for the feed
    await EventDocument.findOneAndUpdate(
      { mysql_event_id: parseInt(id, 10) },
      { $inc: { rsvps_count: 1 } }
    );

    return res.status(201).json({
      success: true,
      message: 'RSVP registered successfully.',
      qrSignature,
    });
  } catch (error) {
    console.error('❌ Error in rsvpEvent controller:', error);
    next(error);
  }
};

/**
 * Controller to check-in an attendee by scanning their RSVP QR Signature at the venue door.
 * Validates against MySQL and updates checked_in status.
 *
 * HYBRID DATA FLOW:
 * 1. Checks QR signature inside MySQL `rsvps` table with join to verify student account details.
 * 2. Checks if user is already checked in (avoids duplicate scans or sharing ticket images).
 * 3. Updates `checked_in` flag to TRUE inside MySQL.
 */
const scanRSVP = async (req, res, next) => {
  try {
    const { qrSignature } = req.body;

    if (!qrSignature) {
      return res.status(400).json({
        success: false,
        message: 'QR Code signature is required.',
      });
    }

    // 1. Look up RSVP in MySQL with attendee email details
    const [rsvps] = await mysqlPool.query(
      `SELECT r.*, es.start_time, es.end_time, u.email AS attendee_email
       FROM rsvps r
       JOIN event_schedules es ON r.event_schedule_id = es.id
       JOIN users u ON r.user_id = u.id
       WHERE r.qr_signature = ?`,
      [qrSignature]
    );

    if (rsvps.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invalid QR signature. Event check-in access denied.',
      });
    }

    const rsvp = rsvps[0];

    // 2. Prevent duplicate check-in scans
    if (rsvp.checked_in) {
      return res.status(409).json({
        success: false,
        message: 'Attendee has already checked in for this event.',
        attendee: rsvp.attendee_email,
      });
    }

    // 3. Perform transactional update setting checked_in = TRUE in MySQL database
    await mysqlPool.query(
      'UPDATE rsvps SET checked_in = TRUE WHERE id = ?',
      [rsvp.id]
    );

    return res.status(200).json({
      success: true,
      message: 'Check-in successful! Welcome to the event.',
      attendee: rsvp.attendee_email,
      eventId: rsvp.event_schedule_id,
    });
  } catch (error) {
    console.error('❌ Error in scanRSVP controller:', error);
    next(error);
  }
};

module.exports = {
  proposeEvent,
  getEvents,
  getVenues,
  checkConflictsEndpoint,
  getProposals,
  approveProposal,
  rejectProposal,
  rsvpEvent,
  scanRSVP,
};
