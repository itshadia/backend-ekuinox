const mongoose = require('mongoose');

const CartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
    default: 1
  },
  price: {
    type: String,
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});

const CartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  items: [CartItemSchema],
  total: {
    type: Number,
    default: 0
  },
  itemCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'abandoned'],
    default: 'active'
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
CartSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Calculate total and item count before saving
CartSchema.pre('save', function(next) {
  this.itemCount = this.items.reduce((total, item) => total + item.quantity, 0);
  this.total = this.items.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    return total + (price * item.quantity);
  }, 0);
  next();
});

// Index for efficient queries
CartSchema.index({ user: 1, status: 1 });

// Static method to get active cart for user
CartSchema.statics.getActiveCart = function(userId) {
  return this.findOne({ user: userId, status: 'active' })
    .populate('items.product', 'name price sku images category')
    .populate('user', 'name email');
};

// Static method to get or create cart for user
CartSchema.statics.getOrCreateCart = async function(userId) {
  let cart = await this.findOne({ user: userId, status: 'active' });
  if (!cart) {
    cart = await this.create({ user: userId });
  }
  return cart.populate('items.product', 'name price sku images category');
};

// Instance method to add item to cart
CartSchema.methods.addItem = function(productId, quantity, price) {
  const existingItem = this.items.find(item =>
    item.product.toString() === productId.toString()
  );

  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.price = price; // Update price in case it changed
  } else {
    this.items.push({
      product: productId,
      quantity,
      price
    });
  }

  return this.save();
};

// Instance method to update item quantity
CartSchema.methods.updateItemQuantity = function(itemId, quantity) {
  const item = this.items.id(itemId);
  if (item) {
    item.quantity = quantity;
    return this.save();
  }
  throw new Error('Item not found in cart');
};

// Instance method to remove item from cart
CartSchema.methods.removeItem = function(itemId) {
  this.items.pull(itemId);
  return this.save();
};

// Instance method to clear cart
CartSchema.methods.clearCart = function() {
  this.items = [];
  return this.save();
};

// Instance method to checkout cart
CartSchema.methods.checkout = function() {
  this.status = 'completed';
  return this.save();
};

module.exports = mongoose.model('Cart', CartSchema);