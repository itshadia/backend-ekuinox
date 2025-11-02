const mongoose = require('mongoose');

const CountrySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a country name'],
    unique: true,
    trim: true,
    maxlength: [100, 'Country name cannot be more than 100 characters']
  },
  code: {
    type: String,
    required: [true, 'Please add a country code'],
    unique: true,
    uppercase: true,
    minlength: [2, 'Country code must be at least 2 characters'],
    maxlength: [3, 'Country code cannot be more than 3 characters']
  },
  flag: {
    type: String,
    trim: true
  },
  continent: {
    type: String,
    required: [true, 'Please add a continent'],
    enum: ['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America']
  },
  currency: {
    code: String,
    name: String,
    symbol: String
  },
  language: {
    type: String,
    trim: true
  },
  timezone: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
CountrySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for search
CountrySchema.index({
  name: 'text',
  code: 'text'
});

module.exports = mongoose.model('Country', CountrySchema);