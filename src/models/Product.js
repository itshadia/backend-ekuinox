const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a product name'],
    trim: true,
    maxlength: [100, 'Product name cannot be more than 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Please add a description'],
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  price: {
    type: String,
    required: [true, 'Please add a price']
  },
  sku: {
    type: String,
    required: [true, 'Please add a SKU'],
    unique: true,
    uppercase: true
  },
  stock: {
    type: Number,
    required: [true, 'Please add stock quantity'],
    min: [0, 'Stock cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Please add a category'],
    enum: ['Watch', 'Electronics', 'Accessories']
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active'
  },
  sizes: [{
    type: String,
    trim: true
  }],
  editions: [{
    type: String,
    trim: true
  }],
  colors: [{
    id: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      required: true
    },
    thumb: {
      type: String,
      required: true
    },
    gallery: [{
      type: String
    }]
  }],
  stats: [{
    label: {
      type: String,
      required: true
    },
    value: {
      type: String,
      required: true
    }
  }],
  videoTitle: {
    type: String,
    trim: true
  },
  videoUrl: {
    type: String,
    trim: true
  },
  images: [{
    url: String,
    alt: String,
    isMain: {
      type: Boolean,
      default: false
    }
  }],
  features: [{
    title: String,
    description: String,
    icon: String,
    image: String
  }],
  relatedProducts: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Product'
  }],
  tags: [{
    type: String,
    trim: true
  }],
  views: {
    type: Number,
    default: 0
  },
  likes: {
    type: Number,
    default: 0
  },
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],
  isPopular: {
    type: Boolean,
    default: false
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
  },
  updatedBy: {
    type: mongoose.Schema.ObjectId,
    ref: 'User'
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
ProductSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Create index for search
ProductSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  tags: 'text'
});

// Static method to get products by category
ProductSchema.statics.getByCategory = function(category) {
  return this.find({ category, status: 'Active' });
};

// Static method to get featured products
ProductSchema.statics.getFeatured = function() {
  return this.find({ isFeatured: true, status: 'Active' });
};

// Static method to get popular products
ProductSchema.statics.getPopular = function() {
  return this.find({ isPopular: true, status: 'Active' });
};

// Instance method to increment views
ProductSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

module.exports = mongoose.model('Product', ProductSchema);