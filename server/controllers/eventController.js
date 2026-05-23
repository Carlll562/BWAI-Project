const { mysqlPool } = require('../config/db');
const { checkConflicts } = require('../services/conflictEngine');

/**
 * Controller to handle proposing a new event.
 * Validates against Hard & Soft conflicts, writes to MySQL database,
 * and returns conflict reports and warning flags.
 */
const proposeEvent = async (req, res, next) => {
  try {
    const { organizationId, venueId, startTime, endTime } = req.validatedBody;

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

    // 5. Respond to client
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

module.exports = {
  proposeEvent,
};
