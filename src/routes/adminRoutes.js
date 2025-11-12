const express = require('express');
const { body } = require('express-validator');
const {
  getDashboardStats,
  getSystemInfo,
  initializeAdmin
} = require('../controllers/adminController');
const {
  getCancellationRequests,
  processCancellation,
  deleteOrder,
  refundPayment,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/paymentController');
const { protect, adminOnly } = require('../middleware/auth');

// Validation middleware
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

// Public route for initialization (one-time only)
router.post('/init', initializeAdmin);

// Protected routes (Admin only)
router.use(protect);
router.use(adminOnly);

// ============ EXISTING ADMIN ROUTES ============
router.get('/dashboard', getDashboardStats);
router.get('/system', getSystemInfo);

// ============ PAYMENT MANAGEMENT ROUTES ============

// @route   GET /api/admin/orders
// @desc    Get all orders for admin dashboard
// @access  Private/Admin
router.get('/orders', getAllOrders);

// @route   GET /api/admin/cancellation-requests
// @desc    Get all cancellation requests
// @access  Private/Admin  
router.get('/cancellation-requests', getCancellationRequests);

// @route   GET /api/admin/cancellation-requests
// @desc    Get all cancellation requests
// @access  Private/Admin
router.get('/cancellation-requests', getCancellationRequests);

// @route   POST /api/admin/payments/:id/process-cancellation
// @desc    Process cancellation request (approve/reject)
// @access  Private/Admin
router.post('/payments/:id/process-cancellation', [
  body('action').isIn(['approve', 'reject']),
  body('adminNotes').optional().trim().isLength({ max: 1000 }),
  validate
], processCancellation);

// @route   POST /api/admin/payments/:id/refund
// @desc    Process manual refund
// @access  Private/Admin
router.post('/payments/:id/refund', [
  body('amount').optional().isFloat({ min: 0.01 }),
  body('reason').optional().trim(),
  validate
], refundPayment);

// @route   PUT /api/admin/orders/:id/status
// @desc    Update order status (admin)
// @access  Private/Admin
router.put('/orders/:id/status', [
  body('status').isIn(['pending', 'succeeded', 'failed', 'canceled', 'cancellation_requested', 'refunded']),
  body('notes').optional().trim().isLength({ max: 1000 }),
  validate
], async (req, res) => {
  try {
    const { status, notes } = req.body;
    const { id } = req.params;
    const Payment = require('../models/Payment');
    
    const order = await Payment.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    // Update order status
    order.status = status;
    if (notes) {
      order.adminNotes = notes;
    }
    
    // Add status change metadata
    if (!order.metadata) order.metadata = new Map();
    order.metadata.set('statusUpdatedAt', new Date().toISOString());
    order.metadata.set('statusUpdatedBy', req.user.id);
    
    await order.save();
    
    res.json({ 
      success: true, 
      data: order,
      message: 'Order status updated successfully'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error updating order status'
    });
  }
});

// @route   POST /api/admin/orders/:id/process-cancellation  
// @desc    Process cancellation request (approve/reject)
// @access  Private/Admin
router.post('/orders/:id/process-cancellation', [
  body('action').isIn(['approve', 'reject']),
  body('adminNotes').optional().trim().isLength({ max: 1000 }),
  validate
], async (req, res) => {
  try {
    const { action, adminNotes } = req.body;
    const { id } = req.params;
    const Payment = require('../models/Payment');
    
    const order = await Payment.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }
    
    if (order.status !== 'cancellation_requested') {
      return res.status(400).json({ 
        success: false, 
        error: 'Order is not in cancellation requested status' 
      });
    }
    
    if (action === 'approve') {
      order.status = 'canceled';
      order.cancellationProcessedAt = new Date();
      order.cancellationProcessedBy = req.user.id;
      order.adminNotes = adminNotes;
      
      // TODO: Process refund via Stripe here
      // const refund = await stripe.refunds.create({
      //   payment_intent: order.stripePaymentIntentId,
      // });
      
    } else if (action === 'reject') {
      order.status = 'succeeded';
      order.cancellationRejectedAt = new Date();
      order.cancellationRejectedBy = req.user.id;
      order.adminNotes = adminNotes;
    }
    
    await order.save();
    
    res.json({ 
      success: true, 
      data: order,
      message: `Cancellation request ${action}d successfully`
    });
  } catch (error) {
    console.error('Process cancellation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error processing cancellation'
    });
  }
});

// @route   DELETE /api/admin/payments/:id/delete
// @desc    Soft delete order (complete removal)
// @access  Private/Admin
router.delete('/payments/:id/delete', deleteOrder);

module.exports = router;