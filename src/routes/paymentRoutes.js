
// src/routes/paymentRoutes.js
const express = require('express');
const { body } = require('express-validator');
const {
  createPaymentIntent,
  confirmPayment,
  getPayments,
  getPayment,
  refundPayment,
  requestCancellation,
  cancelOrder,
  getCancellationRequests,
  processCancellation,
  deleteOrder
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

// Import validation middleware - check if it exists
const validate = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

const router = express.Router();

// Payment validation middleware
const paymentValidation = [
  body('amount')
    .isFloat({ min: 0.50 })
    .withMessage('Amount must be at least $0.50'),
  body('customerInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  body('customerInfo.firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name is required'),
  body('customerInfo.lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name is required'),
  body('shippingAddress.address')
    .trim()
    .isLength({ min: 5, max: 255 })
    .withMessage('Shipping address is required'),
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City is required'),
  body('shippingAddress.country')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Country is required'),
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order items are required'),
  validate
];

// Cancellation validation
const cancellationValidation = [
  body('reason')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Reason must be 1-500 characters'),
  validate
];

// Admin cancellation processing validation
const processCancellationValidation = [
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('Action must be approve or reject'),
  body('adminNotes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Admin notes must be less than 1000 characters'),
  validate
];

// User payment routes (protected)
router.post('/create-intent', protect, paymentValidation, createPaymentIntent);
router.post('/confirm/:paymentIntentId', protect, confirmPayment);
router.get('/', protect, getPayments);
router.get('/user', protect, getPayments); 
router.get('/:id', protect, getPayment);

// User cancellation routes (protected)
router.post('/:id/cancel-request', protect, cancellationValidation, requestCancellation);
router.post('/cancel-request', protect, cancellationValidation, requestCancellation); // Add this for frontend compatibility
router.delete('/:id/cancel', protect, cancelOrder); 
router.post('/cancel', protect, cancelOrder); // Add this route for frontend compatibility

module.exports = router;