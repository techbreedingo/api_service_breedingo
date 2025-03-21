const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose);

//define schema
const userSchema = new mongoose.Schema({
  userId: {
    type: Number,
    unique: true,
    // required: true, // Automatically generated (use a plugin like 'mongoose-sequence' for auto-increment)
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  mobileNumber: {
    type: String,
    required: true,
    validator: function(v) {
      return /^[0-9]{10}$/.test(v);
    },
    message: props => `${props.value} is not a valid mobile number!`,
    minLength: 10,
    maxLength: 10
  },
  farmName: {
    type: String,
  },
  state: {
    type: String,
  },
  district: {
    type: String,
  },
  taluka: {
    type: String,
  },
  village: {
    type: String,
  },
  pinCode: {
    type: Number,
  },
  cowCount: {
    type: Number,
    required: true,
    default: 0,
  },
  buffaloCount: {
    type: Number,
    required: true,
    default: 0,
  },
  cowCalfCount: {
    type: Number,
    required: true,
    default: 0,
  },
  buffaloCalfCount: {
    type: Number,
    required: true,
    default: 0,
  },
  createdOn:{
    type:Date,
    required:true,
    default: Date.now
  },
  lastLogIn:{
    type:Date,
    required:false
  },
  status:{
    type: String,
    required: true,   
    enum :['In Progress', 'Active', 'InActive'],
    default: 'In Progress',
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});

userSchema.plugin(AutoIncrement, { inc_field: 'userId' });

//model create by using schema
const User = mongoose.model('User',userSchema);



module.exports = User;