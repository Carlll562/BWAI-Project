const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    actor: {
      user_id: { type: Number, required: true },
      email: { type: String, required: true, trim: true },
      role: { type: String, required: true },
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    target_entity: {
      type: String,
      required: true,
      trim: true,
    },
    target_id: {
      type: Number,
      required: true,
    },
    changes: {
      before: mongoose.Schema.Types.Mixed,
      after: mongoose.Schema.Types.Mixed,
    },
  },
  {
    collection: 'AuditLogs',
  }
);

module.exports = mongoose.model('AuditLog', AuditLogSchema);
