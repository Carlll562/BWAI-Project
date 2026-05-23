const express = require('express');
const router = express.Router();
const { validateProposal } = require('../middlewares/validation');
const {
  proposeEvent,
  getEvents,
  getVenues,
  checkConflictsEndpoint,
  getProposals,
  approveProposal,
  rejectProposal,
  rsvpEvent,
  scanRSVP,
} = require('../controllers/eventController');

// 1. Discovery Feed routes
router.get('/', getEvents);

// 2. Auxiliary routes
router.get('/venues', getVenues);
router.post('/check-conflicts', checkConflictsEndpoint);
router.get('/proposals', getProposals);

// 3. Organizer submit route
router.post('/', validateProposal, proposeEvent);

// 4. Admin action routes
router.post('/:id/approve', approveProposal);
router.post('/:id/reject', rejectProposal);

// 5. Student RSVP route
router.post('/:id/rsvp', rsvpEvent);

// 6. Attendance check-in scan route
router.post('/rsvp/scan', scanRSVP);

module.exports = router;
