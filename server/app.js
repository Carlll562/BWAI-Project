const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const eventRoutes = require('./routes/eventRoutes');

const app = express();

// Premium Security Headers and CORS controls
app.use(helmet());
app.use(cors());
app.use(express.json());

// Main Proposal API Mount Endpoint
app.use('/api/events', eventRoutes);

// Base route for connectivity verification
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend is healthy and responsive.' });
});

// Centralized Global Error Handler (Zero-Trust fallback)
app.use((err, req, res, next) => {
  console.error('🔥 Global Exception Intercepted:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error occurred.',
  });
});

module.exports = app;
