const { mysqlPool } = require('../config/db');
const { checkConflicts } = require('../services/conflictEngine');
const EventDocument = require('../models/mongo/EventDocument');

/**
 * Controller to handle proposing a new event.
 * Validates against Hard & Soft conflicts, writes to MySQL database,
 * persists the initial metadata document to MongoDB, and returns conflict reports.
 */
const proposeEvent = async (req, res, next) => {
  try {
    const { organizationId, venueId, startTime, endTime, metadata } = req.validatedBody;
    const { title, description, tags } = metadata;

    // 1. Run Two-Stage Conflict-Detection Engine
    const conflictResult = await checkConflicts(req.validatedBody);

    // 2. Reject proposal immediately if Hard Conflict is detected
    if (conflictResult.hasHardConflict) {
      return res.status(409).json({
        success: false,
        message: conflictResult.reason,
      });
    }

    // 3. Assign appropriate relational status
    // If soft conflicts exist -> NEEDS_REVIEW, else -> PENDING
    const status = conflictResult.warnings.length > 0 ? 'NEEDS_REVIEW' : 'PENDING';

    // 4. Save event proposal in MySQL
    // Relational/Relational State transitions strictly write to MySQL (Guardrail 1)
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

    // Fetch organizer name from MySQL users table for MongoDB sync
    const [userRows] = await mysqlPool.query('SELECT email FROM users WHERE id = ?', [organizationId]);
    const orgEmail = userRows.length > 0 ? userRows[0].email : `Org ${organizationId}`;
    const organizerName = orgEmail.split('@')[0].toUpperCase().replace('.', ' ');

    // 5. Persist the proposal draft to MongoDB EventDocuments (Guardrail 1)
    // Discovery Feed reads exclusively from MongoDB. Draft status written here.
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

    // 6. Respond to client
    return res.status(201).json({
      success: true,
      message: 'Event proposed successfully',
      eventId,
      status,
      warnings: conflictResult.warnings,
    });
  } catch (error) {
    console.error('❌ Error in proposeEvent controller:', error);
    next(error);
  }
};

/**
 * Controller to fetch all approved events for Student Discovery Feed.
 * Reads exclusively from MongoDB.
 */
const getEvents = async (req, res, next) => {
  try {
    const { tag, tags } = req.query;
    const filter = { status: 'APPROVED' };

    if (tag) {
      filter.tags = tag;
    } else if (tags) {
      filter.tags = { $in: tags.split(',') };
    }

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

    const [schedules] = await mysqlPool.query(sql, params);

    if (schedules.length === 0) {
      return res.status(200).json({
        success: true,
        proposals: [],
      });
    }

    // Merge rich details from MongoDB EventDocuments
    const mysqlIds = schedules.map(s => s.id);
    const mongoDocs = await EventDocument.find({ mysql_event_id: { $in: mysqlIds } });
    const mongoMap = new Map(mongoDocs.map(doc => [doc.mysql_event_id, doc]));

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
 * and synchronizesapproved status to MongoDB.
 */
const approveProposal = async (req, res, next) => {
  const connection = await mysqlPool.getConnection();
  try {
    const { id } = req.params;
    const adminId = req.body.adminId || 99; // Default admin simulated ID
    const reason = req.body.reason || 'Sufficient capacity and time slots allocated.';

    await connection.beginTransaction();

    // 1. Update MySQL Event status to APPROVED
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

    // 2. Log action in relational approvals table
    await connection.query(
      `INSERT INTO approvals (event_schedule_id, admin_id, action, reason)
       VALUES (?, ?, 'APPROVED', ?)`,
      [id, adminId, reason]
    );

    await connection.commit();

    // 3. Synchronize APPROVED status to MongoDB EventDocument
    await EventDocument.findOneAndUpdate(
      { mysql_event_id: parseInt(id, 10) },
      { status: 'APPROVED' }
    );

    return res.status(200).json({
      success: true,
      message: 'Proposal approved successfully, synchronized with MongoDB Discovery feed.',
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Error in approveProposal controller:', error);
    next(error);
  } finally {
    connection.release();
  }
};

/**
 * Controller to handle Admin Rejection.
 * Logs action and reason in approvals, and updates status in MongoDB.
 */
const rejectProposal = async (req, res, next) => {
  const connection = await mysqlPool.getConnection();
  try {
    const { id } = req.params;
    const adminId = req.body.adminId || 99;
    const { reason } = req.body;

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'A rejection reason is strictly required',
      });
    }

    await connection.beginTransaction();

    // 1. Update MySQL Event status to REJECTED
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

    // 2. Log in approvals table
    await connection.query(
      `INSERT INTO approvals (event_schedule_id, admin_id, action, reason)
       VALUES (?, ?, 'REJECTED', ?)`,
      [id, adminId, reason]
    );

    await connection.commit();

    // 3. Synchronize status to MongoDB EventDocument
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
 */
const rsvpEvent = async (req, res, next) => {
  try {
    const { id } = req.params; // MySQL event schedule ID
    const userId = req.body.userId || 10; // Default simulated student user ID
    
    // 1. Verify that the event is approved
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

    // 2. Check for double-RSVPs in MySQL
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

    // 3. Generate secure QR signature
    const qrSignature = `RSVP-${id}-${userId}-${Date.now().toString(36).toUpperCase()}`;

    // 4. Save RSVP to MySQL
    await mysqlPool.query(
      `INSERT INTO rsvps (event_schedule_id, user_id, qr_signature)
       VALUES (?, ?, ?)`,
      [id, userId, qrSignature]
    );

    // 5. Synchronize: Increment rsvps_count in MongoDB EventDocument
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
 * Controller to check-in an attendee by scanning their RSVP QR Signature.
 * Validates against MySQL and updates checked_in status.
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

    // 1. Look up RSVP in MySQL
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

    if (rsvp.checked_in) {
      return res.status(409).json({
        success: false,
        message: 'Attendee has already checked in for this event.',
        attendee: rsvp.attendee_email,
      });
    }

    // 2. Perform transactional update setting checked_in = TRUE
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
