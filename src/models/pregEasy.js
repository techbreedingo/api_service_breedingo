const mongoose = require('mongoose')
const AutoIncrement = require('mongoose-sequence')(mongoose);

//define schema
const pregEasySchema = new mongoose.Schema({
  pregEasyId: {
    type: Number,
    unique: true,
    auto: true,
  },
  userId:{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type:{
    type: String,
    required: true,   
    enum: ['cow', 'buffalo'],
    lowercase: true
  },
  breed:{
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        const cowBreeds = [
          'Holstein Friesian', 'Jersey', 'Sahiwal', 'Gir', 'Red Sindhi',
          'Tharparkar', 'Rathi', 'Kankrej', 'Hariana', 'Ongole'
        ];
        const buffaloBreeds = [
          'Murrah', 'Nili-Ravi', 'Surti', 'Mehsana', 'Jaffarabadi',
          'Bhadawari', 'Nagpuri', 'Pandharpuri', 'Marathwada', 'Toda'
        ];
        return this.type === 'cow' ? 
          cowBreeds.includes(v) : 
          buffaloBreeds.includes(v);
      },
      message: props => `${props.value} is not a valid breed for this cattle type!`
    }
  },
  tagNumber:{
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  nickName:{
    type: String,
    required: false,
    default: '',
    trim: true
  },
  dateOfLastDelivery:{
    type: Date,
    required: true,
    validate: {
      validator: function(v) {
        return v instanceof Date && !isNaN(v);
      },
      message: props => 'Invalid date format for dateOfLastDelivery'
    },
    set: function(v) {
      // Handle both ISO string and YYYY-MM-DD format
      if (typeof v === 'string') {
        // Try parsing as ISO string first
        let date = new Date(v);
        if (isNaN(date.getTime())) {
          // If ISO parsing fails, try YYYY-MM-DD format
          const parts = v.split('-');
          if (parts.length === 3) {
            date = new Date(parts[0], parts[1] - 1, parts[2]);
          }
        }
        return date;
      }
      return v;
    }
  },
  createdAt:{
    type: Date,
    default: Date.now
  }
})

pregEasySchema.pre('save', function(next) {
  // Ensure type is lowercase
  if (this.type) {
    this.type = this.type.toLowerCase();
  }
  
  // Trim strings
  if (this.tagNumber) {
    this.tagNumber = this.tagNumber.trim();
  }
  if (this.nickName) {
    this.nickName = this.nickName.trim();
  }
  
  next();
});

pregEasySchema.plugin(AutoIncrement, {inc_field: 'pregEasyId'});

//Model
const PregEasy = mongoose.model('pregEasy', pregEasySchema)

module.exports = PregEasy