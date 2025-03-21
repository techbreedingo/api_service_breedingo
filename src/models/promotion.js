const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  imageUrl: {
    type: String,
    required: true
  },
  linkUrl: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  order: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'promotions' // Explicitly set collection name to match MongoDB
});

module.exports = mongoose.model('Promotion', promotionSchema);
