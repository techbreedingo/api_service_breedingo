const mongoose = require('mongoose');
// const CattleSell = require('./cattleSell');
// const user = require('./user');
const AutoIncrement = require('mongoose-sequence')(mongoose);

//define schema
const saveCattleSellSchema = new mongoose.Schema({
  saveCattleSellId: {
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
  saveOn:{
    type:Date,
    required:false
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});

saveCattleSellSchema.plugin(AutoIncrement, { inc_field: 'saveCattleSellId' });

//model create by using schema
const saveCattleSell = mongoose.model('saveCattleSell',saveCattleSellSchema);

module.exports = saveCattleSell;