const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a city name'],
    trim: true,
    maxlength: [100, 'City name cannot be more than 100 characters']
  },
  country: {
    type: mongoose.Schema.ObjectId,
    ref: 'Country',
    required: [true, 'Please add a country']
  },
  state: {
    type: String,
    trim: true,
    maxlength: [100, 'State name cannot be more than 100 characters']
  },
  population: {
    type: Number,
    min: [0, 'Population cannot be negative']
  },
  coordinates: {
    latitude: {
      type: Number,
      min: [-90, 'Latitude must be between -90 and 90'],
      max: [90, 'Latitude must be between -90 and 90']
    },
    longitude: {
      type: Number,
      min: [-180, 'Longitude must be between -180 and 180'],
      max: [180, 'Longitude must be between -180 and 180']
    }
  },
  timezone: {
    type: String,
    trim: true
  },
  isCapital: {
    type: Boolean,
    default: false
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
CitySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create compound index for unique city-country combination
CitySchema.index({ name: 1, country: 1 }, { unique: true });

// Create index for search
CitySchema.index({
  name: 'text',
  state: 'text'
});

// Populate country information
CitySchema.pre(/^find/, function(next) {
  this.populate({
    path: 'country',
    select: 'name code flag'
  });
  next();
});

module.exports = mongoose.model('City', CitySchema);