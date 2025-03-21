const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

// Schema for individual events
const eventSchema = new mongoose.Schema({
  eventType: {
    type: String,
    required: true,
    enum: ['medicine', 'deworming', 'first_heat', 'heat_cycle', 'heat_detection', 'heat_check_before_pd', 'pd_check', 'expected_delivery'],
  },
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  scheduledDate: {
    type: Date,
    required: true,
  },
  completedDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'skipped'],
    default: 'pending',
  },
  aiStatus: {
    type: String,
    enum: ['pending', 'done', 'not_done', 'no_ai'],
  },
  semenBullDetails: String,
  heatSigns: [String],
  heatDate: {  
    type: Date,
  },
  heatVisible: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
});

// Main schema for cattle events
const pregEasyEventSchema = new mongoose.Schema({
  eventId: {
    type: Number,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pregEasyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PregEasy',
    required: true,
  },
  events: [eventSchema], // Array of events
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  }
}, {
  collection: 'pregeasyevents'
});

// Apply the auto-increment plugin to eventId
pregEasyEventSchema.plugin(AutoIncrement, {
  inc_field: 'eventId',
  start_seq: 1,
  collection_name: 'pregeasyevent_counter'
});

// Update the updatedAt timestamp before saving
pregEasyEventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

const PregEasyEvent = mongoose.model('PregEasyEvent', pregEasyEventSchema);

module.exports = PregEasyEvent;
