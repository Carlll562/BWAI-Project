const { mysqlPool } = require('../config/db');
const EventDocument = require('../models/mongo/EventDocument');

/**
 * Checks for scheduling conflicts for a new event proposal.
 * Implements the core conflict-prevention engine across relational (MySQL)
 * and document (MongoDB) boundary layers.
 *
 * This conflict prevention runs in a two-stage evaluation:
 * - STAGE 1 (Hard Conflicts): Triggers immediate rejection (409 Conflict).
 *   1. Venue existence and operating hour boundaries.
 *   2. Physical overlap (double booking) at the same venue for APPROVED events.
 *
 * - STAGE 2 (Soft Conflicts): Triggers warnings and automatically flags
 *   the proposal as 'NEEDS_REVIEW' for human administrator intervention.
 *   3. Same organization double-booked in different venues concurrently.
 *   4. Less than 15-minute buffer between events at the same venue.
 *   5. MongoDB tag-based audience overlap (approved events in the same time frame sharing tags).
 *
 * @param {Object} proposal
 * @param {number} proposal.organizationId - ID of the proposing organization
 * @param {number} proposal.venueId - ID of the proposed venue
 * @param {string} proposal.startTime - ISO 8601 UTC timestamp of start
 * @param {string} proposal.endTime - ISO 8601 UTC timestamp of end
 * @param {Object} proposal.metadata - Title, description, tags
 * @param {string[]} [proposal.metadata.tags] - Array of dynamic category tags
 * @returns {Promise<Object>} conflictReport - Conflict detection result with warning alerts
 */
const checkConflicts = async (proposal) => {
  const { organizationId, venueId, startTime, endTime, metadata } = proposal;
  const tags = metadata.tags || [];

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // ==========================================================================
  // --- STAGE 1: HARD CONFLICTS (Immediate Rejection) ---
  // ==========================================================================

  // 1. Verify Venue Existence and Operating Hours
  // We query MySQL using a prepared statement to prevent SQL injection.
  const [venues] = await mysqlPool.query(
    'SELECT * FROM venues WHERE id = ?',
    [venueId]
  );

  if (venues.length === 0) {
    return {
      hasHardConflict: true,
      reason: 'Venue Closed', // Venue doesn't exist, treat as closed/unavailable
    };
  }

  const venue = venues[0];
  const { name: venueName, capacity: venueCapacity, operating_start, operating_end } = venue;

  // Extract UTC time components to compare with operating_start and operating_end.
  // operating_start and operating_end are time strings formatted as "HH:MM:SS" (e.g., "08:00:00").
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  
  // Extract date portion: YYYY-MM-DD
  const startDateStr = startISO.substring(0, 10);
  const endDateStr = endISO.substring(0, 10);
  
  // Extract time portion: HH:MM:SS
  const startTimePart = startISO.substring(11, 19);
  const endTimePart = endISO.substring(11, 19);

  let isClosed = false;
  if (startDateStr !== endDateStr) {
    // If the event spans across multiple dates, it is considered a hard conflict
    // unless the venue explicitly supports 24-hour operations.
    const is24Hours = (operating_start === '00:00:00' && 
      (operating_end === '23:59:59' || operating_end === '24:00:00' || operating_end === '00:00:00'));
    if (!is24Hours) {
      isClosed = true;
    }
  } else {
    // Single-day event: Verify that the proposed start time is at or after operating_start,
    // and the proposed end time is at or before operating_end.
    if (startTimePart < operating_start || endTimePart > operating_end) {
      isClosed = true;
    }
  }

  if (isClosed) {
    return {
      hasHardConflict: true,
      reason: 'Venue Closed',
    };
  }

  // 2. Physical Venue Schedule Overlap
  // Checks if the venue is already occupied by a previously APPROVED event during the proposed window.
  // Mathematical Overlap Formula: (Start_Existing < End_New) AND (End_Existing > Start_New)
  // This formula guarantees overlap detection for any intersecting intervals, including:
  // - Sub-intervals fully enclosed (e.g., existing 13:00-15:00, proposed 14:00-14:30)
  // - Overlap at boundary edges (e.g., existing 13:00-15:00, proposed 14:59-16:00)
  // - Proposed event completely engulfs existing (e.g., existing 13:00-15:00, proposed 12:00-16:00)
  // Strict separation of concerns is maintained here: relational conflicts are checked exclusively
  // in MySQL using the transactional event_schedules table to prevent race conditions.
  const [venueOverlaps] = await mysqlPool.query(
    `SELECT * FROM event_schedules 
     WHERE venue_id = ? 
       AND status = 'APPROVED' 
       AND start_time < ? 
       AND end_time > ?`,
    [venueId, endDate, startDate]
  );

  if (venueOverlaps.length > 0) {
    return {
      hasHardConflict: true,
      reason: 'Venue Double Booked',
    };
  }

  // ==========================================================================
  // --- STAGE 2: SOFT CONFLICTS (Flagged with Warnings) ---
  // ==========================================================================
  const warnings = [];

  // 3. Organizer Double-Booking Check
  // Validates if the same student organization is proposing an event in a DIFFERENT venue
  // during the same time window. We check APPROVED, PENDING, and NEEDS_REVIEW states.
  // Although not a hard physical overlap (since they are in different locations), it flags a warning
  // because student organizations generally lack the capacity or human resources to run separate
  // major events concurrently, requiring admin oversight to verify staffing feasibility.
  const [orgOverlaps] = await mysqlPool.query(
    `SELECT * FROM event_schedules 
     WHERE organization_id = ? 
       AND venue_id != ? 
       AND status IN ('APPROVED', 'PENDING', 'NEEDS_REVIEW')
       AND start_time < ? 
       AND end_time > ?`,
    [organizationId, venueId, endDate, startDate]
  );

  if (orgOverlaps.length > 0) {
    warnings.push('Organizer double-booked across venues');
  }

  // 4. Same Venue Back-to-Back buffer check (< 15 minutes buffer)
  // If another APPROVED event ends within 15 minutes of this event's start, or starts within
  // 15 minutes of this event's end, we flag a soft warning. This buffer allows for:
  // - Logistical transition time (cleaning, setting up sound systems/chairs, and crowd dispersal).
  // - Preventing chaotic overlaps at entry/exit points between back-to-back groups.
  // Using strict inequality (e.g., end_time < startDate and start_time > endDate) ensures that
  // perfect adjacency (0 minutes gap, such as one class ending and another immediately starting)
  // does not flag a buffer warning, while a gap of 1 to 14 minutes is caught.
  const startTimeMinus15 = new Date(startDate.getTime() - 15 * 60 * 1000);
  const endTimePlus15 = new Date(endDate.getTime() + 15 * 60 * 1000);

  const [bufferOverlaps] = await mysqlPool.query(
    `SELECT * FROM event_schedules 
     WHERE venue_id = ? 
       AND status = 'APPROVED' 
       AND (
          (end_time < ? AND end_time > ?)
          OR
          (start_time > ? AND start_time < ?)
        )`,
    [venueId, startDate, startTimeMinus15, endDate, endTimePlus15]
  );

  if (bufferOverlaps.length > 0) {
    warnings.push('Less than 15-minute buffer between events at same venue');
  }

  // 5. MongoDB Tag-Based Audience Overlap Check
  // Implements hybrid database interaction (Zero-Trust separation).
  // Student discovery and event metadata are stored in MongoDB to support rich queries and dynamic tagging.
  // Here, we look up whether any approved events share interest tags with the new proposal during the
  // overlapping time frame [S_new, E_new]. If they do, it flags a warning to protect audience attention,
  // preventing competing events of similar interest (e.g., two hackathons or two academic panels) from
  // cannibalizing each other's attendance and diminishing overall engagement.
  let audienceOverlapTags = [];
  if (tags.length > 0) {
    const mongoOverlaps = await EventDocument.find({
      status: 'APPROVED',
      'schedule.start_time': { $lt: endDate },
      'schedule.end_time': { $gt: startDate },
      tags: { $in: tags }
    });

    if (mongoOverlaps.length > 0) {
      const overlappingTagsSet = new Set();
      mongoOverlaps.forEach(doc => {
        doc.tags.forEach(tag => {
          if (tags.includes(tag)) {
            overlappingTagsSet.add(tag);
          }
        });
      });
      audienceOverlapTags = Array.from(overlappingTagsSet);
      if (audienceOverlapTags.length > 0) {
        warnings.push(`Audience overlap: ${audienceOverlapTags.join(', ')}`);
      }
    }
  }

  // Return the complete payload. If warnings exist, the controller will auto-upgrade the event
  // status from PENDING to NEEDS_REVIEW, routing it to the administrator dashboard review queue.
  return {
    hasHardConflict: false,
    warnings,
    venueName,
    venueCapacity,
  };
};

module.exports = {
  checkConflicts,
};
