const { mysqlPool } = require('../config/db');
const EventDocument = require('../models/mongo/EventDocument');

/**
 * Checks for scheduling conflicts for a new event proposal.
 *
 * @param {Object} proposal
 * @param {number} proposal.organizationId - ID of the proposing organization
 * @param {number} proposal.venueId - ID of the proposed venue
 * @param {string} proposal.startTime - ISO 8601 UTC timestamp of start
 * @param {string} proposal.endTime - ISO 8601 UTC timestamp of end
 * @param {Object} proposal.metadata - Title, description, tags
 * @param {string[]} [proposal.metadata.tags] - Array of dynamic category tags
 * @returns {Promise<Object>} conflictReport - Conflict detection result
 */
const checkConflicts = async (proposal) => {
  const { organizationId, venueId, startTime, endTime, metadata } = proposal;
  const tags = metadata.tags || [];

  const startDate = new Date(startTime);
  const endDate = new Date(endTime);

  // --- STAGE 1: HARD CONFLICTS (Immediate Rejection) ---

  // 1. Verify Venue Existence and Operating Hours
  const [venues] = await mysqlPool.query(
    'SELECT * FROM venues WHERE id = ?',
    [venueId]
  );

  if (venues.length === 0) {
    return {
      hasHardConflict: true,
      reason: 'Venue Closed', // Return 'Venue Closed' or similar if venue doesn't exist
    };
  }

  const venue = venues[0];
  const { name: venueName, capacity: venueCapacity, operating_start, operating_end } = venue;

  // Extract UTC time components to match operating_start and operating_end
  // operating_start/operating_end are strings like "08:00:00" and "22:00:00"
  const startISO = startDate.toISOString();
  const endISO = endDate.toISOString();
  
  const startDateStr = startISO.substring(0, 10);
  const endDateStr = endISO.substring(0, 10);
  
  const startTimePart = startISO.substring(11, 19);
  const endTimePart = endISO.substring(11, 19);

  let isClosed = false;
  if (startDateStr !== endDateStr) {
    // If it spans multiple days, it is closed unless the venue is open 24 hours
    const is24Hours = (operating_start === '00:00:00' && 
      (operating_end === '23:59:59' || operating_end === '24:00:00' || operating_end === '00:00:00'));
    if (!is24Hours) {
      isClosed = true;
    }
  } else {
    // Single day event: start must be >= operating_start and end must be <= operating_end
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
  // SQL Overlap logic: start_time < E_new AND end_time > S_new
  // Ensure we only query approved bookings as per SDD
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

  // --- STAGE 2: SOFT CONFLICTS (Flagged with Warnings) ---
  const warnings = [];

  // 3. Organizer Double-Booking Check
  // Does the organization have another APPROVED, PENDING, or NEEDS_REVIEW event at a DIFFERENT venue during [S_new, E_new]?
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
  const startTimeMinus15 = new Date(startDate.getTime() - 15 * 60 * 1000);
  const endTimePlus15 = new Date(endDate.getTime() + 15 * 60 * 1000);

  const [bufferOverlaps] = await mysqlPool.query(
    `SELECT * FROM event_schedules 
     WHERE venue_id = ? 
       AND status = 'APPROVED'        AND (
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
  // Does another APPROVED event share tags with the new proposal during [S_new, E_new]?
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
