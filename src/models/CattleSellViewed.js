const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

//define schema
const CattleSellViewedSchema = new mongoose.Schema({
  cattleSellViewedId: {
    type: Number,
    unique: true,
    auto: true, // Automatically generated (use a plugin like 'mongoose-sequence' for auto-increment)
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user', // Reference to User model
    required: true,
  },
  cattleSellId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'cattleSell', // Reference to cattleSell model
    required: true,
  },
  viewedContactNumber:{
    type:Boolean,
    default:false,
    required:true
  },
  viewedOn:{
    type:Date,
    required:false
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});

CattleSellViewedSchema.plugin(AutoIncrement, { inc_field: 'cattleSellViewedId' });

//model create by using schema
const cattleSellViewed = mongoose.model('CattleSellViewed',CattleSellViewedSchema);

module.exports = cattleSellViewed;