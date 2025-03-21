const mongoose = require('mongoose')

//define schema
const userCoinSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to User model
        required: true,
  },
  totalCoin: {
    type: Number,
    required: true,
    default: 0,
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});

//model create by using schema
const UserCoin = mongoose.model('userCoin',userCoinSchema);

module.exports = UserCoin;