// src/controllers/paymentController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const User = require('../models/User');


exports.createPaymentIntent = async (req, res) => {
  try {
    const {
      amount,
      currency = 'usd',
      paymentMethod,
      customerInfo,
      shippingAddress,
      billingAddress,
      items,
      metadata = {}
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid amount is required'
      });
    }

    if (!customerInfo || !customerInfo.email) {
      return res.status(400).json({
        success: false,
        error: 'Customer information is required'
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Order items are required'
      });
    }

    let customer;
    const existingCustomer = await stripe.customers.list({
      email: customerInfo.email,
      limit: 1
    });

    if (existingCustomer.data.length > 0) {
      customer = existingCustomer.data[0];
    } else {
      customer = await stripe.customers.create({
        email: customerInfo.email,
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        phone: customerInfo.phone,
        address: {
          line1: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: shippingAddress.country,
          postal_code: shippingAddress.zipCode
        }
      });
    }

    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: currency.toLowerCase(),
      customer: customer.id,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        userId: req.user.id,
        orderId: `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
        ...metadata
      },
      shipping: {
        name: `${customerInfo.firstName} ${customerInfo.lastName}`,
        address: {
          line1: shippingAddress.address,
          city: shippingAddress.city,
          state: shippingAddress.state,
          country: shippingAddress.country,
          postal_code: shippingAddress.zipCode
        }
      },
      description: `Order for ${items.length} item(s)`
    });

    
    const payment = await Payment.create({
      user: req.user.id,
      stripePaymentIntentId: paymentIntent.id,
      orderId: paymentIntent.metadata.orderId,
      amount,
      currency,
      paymentMethod,
      customerInfo,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      items,
      metadata,
      stripeCustomerId: customer.id,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      data: {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        orderId: payment.orderId,
        amount: payment.amount,
        currency: payment.currency
      }
    });

  } catch (error) {
    console.error('Create payment intent error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error creating payment intent'
    });
  }
};


exports.confirmPayment = async (req, res) => {
  try {
    const { paymentIntentId } = req.params;
    const { paymentDetails } = req.body;

    
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    
    const payment = await Payment.findOne({
      stripePaymentIntentId: paymentIntentId,
      user: req.user.id
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }


    // Update payment status - keep as pending until admin processes
    // Only update to failed if payment actually failed
    if (paymentIntent.status === 'failed' || paymentIntent.status === 'canceled') {
      payment.status = 'failed';
    } else if (paymentIntent.status === 'succeeded') {
      // Keep status as 'pending' for admin to process
      // payment.status remains 'pending'
      payment.paymentProcessedAt = new Date();
    }
    
    if (paymentDetails) {
      payment.paymentDetails = {
        last4: paymentDetails.last4,
        brand: paymentDetails.brand,
        cardName: paymentDetails.cardName
      };
    }

    await payment.save();

    res.json({
      success: true,
      data: {
        orderId: payment.orderId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        paymentIntentId: paymentIntent.id
      }
    });

  } catch (error) {
    console.error('Confirm payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error confirming payment'
    });
  }
};


exports.getPayments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { user: req.user.id, isActive: true };
    
    if (req.query.status) {
      query.status = req.query.status;
    }

    const payments = await Payment.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email');

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      count: payments.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: payments
    });

  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error fetching payments'
    });
  }
};


exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user: req.user.id,
      isActive: true
    }).populate('user', 'name email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });

  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error fetching payment'
    });
  }
};


exports.handleWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  
  if (!endpointSecret) {
    console.log('⚠️ Webhook secret not configured - skipping verification (development mode)');
    return res.json({ received: true, message: 'Webhook secret not configured' });
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: paymentIntent.id },
          { 
            status: 'succeeded',
            $set: {
              'metadata.stripeEventId': event.id,
              'metadata.processedAt': new Date()
            }
          }
        );
        console.log('Payment succeeded:', paymentIntent.id);
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        await Payment.findOneAndUpdate(
          { stripePaymentIntentId: failedPayment.id },
          { 
            status: 'failed',
            $set: {
              'metadata.stripeEventId': event.id,
              'metadata.failureReason': failedPayment.last_payment_error?.message,
              'metadata.processedAt': new Date()
            }
          }
        );
        console.log('Payment failed:', failedPayment.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};


exports.refundPayment = async (req, res) => {
  try {
    const { amount, reason = 'requested_by_customer' } = req.body;
    
    const payment = await Payment.findOne({
      _id: req.params.id,
      status: 'succeeded'
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found or cannot be refunded'
      });
    }

    const refundAmount = amount || payment.amount;
    
    if (refundAmount > (payment.amount - payment.refundAmount)) {
      return res.status(400).json({
        success: false,
        error: 'Refund amount exceeds available amount'
      });
    }

    
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentIntentId,
      amount: Math.round(refundAmount * 100),
      reason
    });

    
    payment.refundAmount += refundAmount;
    if (payment.refundAmount >= payment.amount) {
      payment.status = 'refunded';
    }
    
    payment.metadata.set('refundId', refund.id);
    payment.metadata.set('refundReason', reason);
    payment.metadata.set('refundedAt', new Date().toISOString());

    await payment.save();

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refundAmount,
        status: refund.status,
        orderId: payment.orderId
      }
    });

  } catch (error) {
    console.error('Refund payment error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error processing refund'
    });
  }
};

// @desc    Request order cancellation (User)
// @route   POST /api/payments/:id/cancel-request
// @route   POST /api/payments/cancel-request
// @access  Private
exports.requestCancellation = async (req, res) => {
  try {
    const { reason = 'requested_by_customer', orderId: bodyOrderId, additionalInfo } = req.body;
    
    // Handle both URL patterns: /:id/cancel-request and /cancel-request with orderId in body
    const orderId = req.params.id || bodyOrderId;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }
    
    const payment = await Payment.findOne({
      _id: orderId,
      user: req.user.id,
      status: { $in: ['succeeded', 'pending'] },
      isActive: true
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Order not found or cannot be cancelled'
      });
    }

    // Check if already requested
    if (payment.status === 'cancellation_requested') {
      return res.status(400).json({
        success: false,
        error: 'Cancellation already requested for this order'
      });
    }

    // Update payment with cancellation request
    payment.status = 'cancellation_requested';
    payment.cancellationReason = reason;
    payment.cancellationRequestedAt = new Date();
    payment.updatedAt = new Date();
    
    // Add additional info if provided
    if (additionalInfo) {
      payment.adminNotes = `Customer note: ${additionalInfo}`;
    }

    await payment.save();

    // Populate user info for response
    await payment.populate('user', 'name email');

    res.json({
      success: true,
      message: 'Cancellation request submitted successfully. Admin will review shortly.',
      data: {
        _id: payment._id,
        orderId: payment.orderId,
        status: payment.status,
        cancellationReason: payment.cancellationReason,
        requestedAt: payment.cancellationRequestedAt,
        user: payment.user
      }
    });

  } catch (error) {
    console.error('Request cancellation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error requesting cancellation'
    });
  }
};

// @desc    Cancel order (Direct cancellation for pending orders)
// @route   DELETE /api/payments/:id/cancel
// @route   POST /api/payments/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    // Handle both URL patterns: /:id/cancel and /cancel with orderId in body
    const orderId = req.params.id || req.body.orderId;
    
    if (!orderId) {
      return res.status(400).json({
        success: false,
        error: 'Order ID is required'
      });
    }

    const payment = await Payment.findOne({
      _id: orderId,
      user: req.user.id,
      isActive: true
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Check if order can be cancelled directly
    if (payment.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Only pending orders can be cancelled directly. For other orders, please request cancellation.'
      });
    }

    // Cancel the order
    payment.status = 'canceled';
    payment.cancellationProcessedAt = new Date();
    payment.cancellationReason = req.body.reason || 'Cancelled by user';
    payment.cancellationProcessedBy = req.user.id;
    payment.updatedAt = new Date();

    await payment.save();

    // Populate user info for response
    await payment.populate('user', 'name email');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: {
        _id: payment._id,
        orderId: payment.orderId,
        status: payment.status,
        cancellationReason: payment.cancellationReason,
        cancellationProcessedAt: payment.cancellationProcessedAt,
        updatedAt: payment.updatedAt,
        user: payment.user
      }
    });

  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error cancelling order'
    });
  }
};

// @desc    Get cancellation requests (Admin)
// @route   GET /api/admin/cancellation-requests
// @access  Private/Admin
exports.getCancellationRequests = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = {
      status: 'cancellation_requested',
      isActive: true
    };

    const requests = await Payment.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ cancellationRequestedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Payment.countDocuments(query);

    res.json({
      success: true,
      count: requests.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: requests
    });

  } catch (error) {
    console.error('Get cancellation requests error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error fetching cancellation requests'
    });
  }
};

// @desc    Process cancellation (Admin - Approve/Reject)
// @route   POST /api/admin/payments/:id/process-cancellation
// @access  Private/Admin
exports.processCancellation = async (req, res) => {
  try {
    const { action, adminNotes } = req.body; // action: 'approve' or 'reject'
    
    const payment = await Payment.findOne({
      _id: req.params.id,
      status: 'cancellation_requested',
      isActive: true
    }).populate('user', 'firstName lastName email');

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Cancellation request not found'
      });
    }

    if (action === 'approve') {
      // Process refund only if payment was successful
      if (payment.stripePaymentIntentId) {
        try {
          const refund = await stripe.refunds.create({
            payment_intent: payment.stripePaymentIntentId,
            amount: Math.round(payment.amount * 100), // Full refund
            reason: 'requested_by_customer'
          });

          payment.refundAmount = payment.amount;
          payment.metadata = payment.metadata || new Map();
          payment.metadata.set('refundId', refund.id);
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          // Continue with local cancellation even if Stripe fails
        }
      }

      // Update payment record - SOFT DELETE approach
      payment.status = 'canceled';
      payment.cancellationProcessedAt = new Date();
      payment.cancellationProcessedBy = req.user.id;
      payment.adminNotes = adminNotes;
      // Keep isActive = true for record keeping, but status = 'canceled'

    } else if (action === 'reject') {
      // Reject cancellation - restore original status
      payment.status = 'succeeded';
      payment.adminNotes = adminNotes;
      payment.cancellationProcessedAt = new Date();
      payment.cancellationProcessedBy = req.user.id;
    }

    await payment.save();

    res.json({
      success: true,
      message: `Cancellation ${action}d successfully`,
      data: {
        orderId: payment.orderId,
        status: payment.status,
        action: action,
        processedBy: req.user.id,
        processedAt: payment.cancellationProcessedAt
      }
    });

  } catch (error) {
    console.error('Process cancellation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error processing cancellation'
    });
  }
};

// @desc    Soft delete order (Admin only - Complete removal)
// @route   DELETE /api/admin/payments/:id/delete
// @access  Private/Admin
exports.deleteOrder = async (req, res) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      isActive: true
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Soft delete by setting isActive to false
    payment.isActive = false;
    payment.metadata = payment.metadata || new Map();
    payment.metadata.set('deletedAt', new Date().toISOString());
    payment.metadata.set('deletedBy', req.user.id);

    await payment.save();

    res.json({
      success: true,
      message: 'Order deleted successfully',
      data: {
        orderId: payment.orderId,
        deletedAt: payment.metadata.get('deletedAt')
      }
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error deleting order'
    });
  }
};

// @desc    Get all orders for admin dashboard
// @route   GET /api/admin/orders
// @access  Private/Admin
exports.getAllOrders = async (req, res) => {
  try {
    const {
      status,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      search,
      startDate,
      endDate
    } = req.query;

    // Build query
    const query = { isActive: true };

    // Status filter
    if (status && status !== 'all') {
      query.status = status;
    }

    // Search filter (orderId, customer email, or customer name)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { orderId: searchRegex },
        { 'customerInfo.email': searchRegex },
        { 'customerInfo.firstName': searchRegex },
        { 'customerInfo.lastName': searchRegex }
      ];
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Sort order
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const [orders, total] = await Promise.all([
      Payment.find(query)
        .populate('user', 'name email')
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNumber)
        .lean(),
      Payment.countDocuments(query)
    ]);

    // Calculate pagination info
    const totalPages = Math.ceil(total / limitNumber);
    const hasNextPage = pageNumber < totalPages;
    const hasPrevPage = pageNumber > 1;

    // Format response data
    const formattedOrders = orders.map(order => ({
      _id: order._id,
      orderId: order.orderId,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      paymentMethod: order.paymentMethod,
      customerInfo: order.customerInfo,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      items: order.items || [],
      stripePaymentIntentId: order.stripePaymentIntentId,
      stripeCustomerId: order.stripeCustomerId,
      cancellationReason: order.cancellationReason,
      cancellationRequestedAt: order.cancellationRequestedAt,
      cancellationProcessedAt: order.cancellationProcessedAt,
      cancellationProcessedBy: order.cancellationProcessedBy,
      adminNotes: order.adminNotes,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      user: order.user
    }));

    res.json({
      success: true,
      data: formattedOrders,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        status: status || 'all',
        search: search || '',
        startDate: startDate || '',
        endDate: endDate || ''
      }
    });

  } catch (error) {
    console.error('Get all orders error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error fetching orders'
    });
  }
};

// @desc    Update order status (Admin only)
// @route   PUT /api/admin/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminNotes } = req.body;

    // Find the order
    const order = await Payment.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }

    // Store previous status for logging
    const previousStatus = order.status;

    // Update the order
    order.status = status;
    if (adminNotes) {
      order.adminNotes = adminNotes;
    }
    order.updatedAt = new Date();

    // If status is changed to cancelled, handle refund
    if (status === 'cancelled' && previousStatus !== 'cancelled') {
      order.cancellationProcessedAt = new Date();
      order.cancellationProcessedBy = req.user._id;
      
      // Auto-process refund if payment was successful
      if (order.stripePaymentIntentId && previousStatus === 'completed') {
        try {
          const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
          const refund = await stripe.refunds.create({
            payment_intent: order.stripePaymentIntentId,
            reason: 'requested_by_customer',
            metadata: {
              orderId: order.orderId,
              processedBy: req.user._id.toString(),
              adminNotes: adminNotes || 'Status updated to cancelled by admin'
            }
          });
          
          order.refund = {
            stripeRefundId: refund.id,
            amount: refund.amount / 100, // Convert back to dollars
            currency: refund.currency,
            status: refund.status,
            reason: refund.reason,
            processedAt: new Date(),
            processedBy: req.user._id
          };
        } catch (stripeError) {
          console.error('Stripe refund error:', stripeError);
          // Continue with status update even if refund fails
          order.adminNotes = `${adminNotes || ''} - Note: Automatic refund failed: ${stripeError.message}`;
        }
      }
    }

    await order.save();

    // Populate user info for response
    await order.populate('user', 'name email');

    res.json({
      success: true,
      message: `Order status updated from ${previousStatus} to ${status}`,
      data: {
        _id: order._id,
        orderId: order.orderId,
        status: order.status,
        previousStatus,
        adminNotes: order.adminNotes,
        updatedAt: order.updatedAt,
        user: order.user,
        refund: order.refund
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error updating order status'
    });
  }
};