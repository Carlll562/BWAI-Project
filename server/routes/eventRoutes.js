const express = require('express');
const router = express.Router();
const { validateProposal } = require('../middlewares/validation');
const { proposeEvent } = require('../controllers/eventController');

// Proposed route matching conflict validation pipeline guidelines
router.post('/', validateProposal, proposeEvent);

module.exports = router;
