// src/models/Payment.js
const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stripePaymentIntentId: {
    type: String,
    required: true,
    unique: true
  },
  orderId: {
    type: String,
    required: true,
    unique: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'usd',
    lowercase: true
  },
  status: {
    type: String,
    enum: ['pending', 'succeeded', 'failed', 'canceled', 'refunded', 'cancellation_requested'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'cod'],
    required: true
  },
  customerInfo: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: String
  },
  shippingAddress: {
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    country: { type: String, required: true },
    zipCode: { type: String, required: true }
  },
  billingAddress: {
    address: String,
    city: String,
    state: String,
    country: String,
    zipCode: String,
    sameAsShipping: { type: Boolean, default: true }
  },
  items: [{
    productId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: String
  }],
  metadata: {
    type: Map,
    of: String
  },
  stripeCustomerId: String,
  paymentDetails: {
    last4: String,
    brand: String,
    cardName: String
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  // Payment processing timestamps
  paymentProcessedAt: Date, // When payment was successfully processed
  // Cancellation fields
  cancellationReason: String,
  cancellationRequestedAt: Date,
  cancellationProcessedAt: Date,
  cancellationProcessedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  adminNotes: String,
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});


PaymentSchema.pre('save', function(next) {
  if (!this.orderId) {
    this.orderId = `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  }
  next();
});


PaymentSchema.index({ user: 1, createdAt: -1 });
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model('Payment', PaymentSchema);