const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose);

//define schema
const cattleSellSchema = new mongoose.Schema({
  cattleId: {
    type: Number,
    unique: true,
    auto: true, // Automatically generated (use a plugin like 'mongoose-sequence' for auto-increment)
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to User model
    required: true,
  },
  type:{
    type: String,
    required: true,   
    enum :['Cow', 'Buffalo', 'Cow-Calf', 'Buffalo-Calf']
  },
  images: [{
    type: String,
    required: false,
  }],
  cattleBreed:{
    type:String,
    required:true
  },
  dateOfDelivery:{
    type:String,
    required:false
  },
  dateOfBirth:{
    type:String,
    required:false
  },
  numberOfLactation:{
    type:Number,
    required:false,
    default: 0,
  },
  dailyMilkProduction:{
    type:Number,
    required:false,
    default: 0,
  },
  estimatedDailyMilkCapacity:{
    type:Number,
    required:false,
    default: 0,
  },
  isPregnant:{
    type:String,
    required:false,
    default: "No",
  },
  usedSemen:{
    type:String,
    required:false,
  },
  isDeworming:{
    type:String,
    required:true,
    default: "No",
  },
  isVaccination:{
    type:String,
    required:true,
    default: "No",
  },
  isHorn:{
    type:String,
    required:true,
    default: "No",
  },
  weight:{
    type:Number,
    required:true,
    default: 0,
  },
  price:{
    type:Number,
    required:true,
    default: 0,
  },
  noOfCalving:{
    type:String,
    required:true,
    default: false
  },
  tagNumber:{
    type:String,
    required:false,
    default: false
  },
  dateOfInsemination:{
    type:String,
    required:false
  },
  isDeleted: {
    type: Boolean,
    required: true,
    default: false,
  },
});

cattleSellSchema.plugin(AutoIncrement, { inc_field: 'cattleId' });

//model create by using schema
const CattleSell = mongoose.model('cattleSell',cattleSellSchema);

module.exports = CattleSell;