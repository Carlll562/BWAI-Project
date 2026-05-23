const mongoose = require('mongoose');

const EventDocumentSchema = new mongoose.Schema(
  {
    mysql_event_id: {
      type: Number,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
    },
    media_urls: [
      {
        type: String,
        trim: true,
      },
    ],
    tags: {
      type: [String],
      index: true,
    },
    organizer_name: {
      type: String,
      required: true,
      trim: true,
    },
    venue: {
      venue_id: { type: Number, required: true },
      name: { type: String, required: true },
      capacity: { type: Number, required: true },
    },
    schedule: {
      start_time: { type: Date, required: true, index: true },
      end_time: { type: Date, required: true, index: true },
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'NEEDS_REVIEW'],
      default: 'PENDING',
      index: true,
    },
    rsvps_count: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: 'EventDocuments',
  }
);

// Compound index to support queries filtering by dynamic tags and date range
EventDocumentSchema.index({ tags: 1, 'schedule.start_time': 1 });

module.exports = mongoose.model('EventDocument', EventDocumentSchema);
