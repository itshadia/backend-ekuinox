const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Get user's active cart
// @route   GET /api/cart
// @access  Private
exports.getCart = async (req, res, next) => {
  try {
    // Fetch cart with targeted populate (colors is embedded, so no extra populate needed)
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' })
      .populate('items.product', 'name price sku images category colors'); // Includes full embedded colors array

    if (!cart) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          total: 0,
          itemCount: 0
        }
      });
    }

    // Format items for easier frontend access (include full colors array)
    const formattedItems = cart.items.map(item => ({
      _id: item._id,
      productId: item.product._id,
      name: item.product.name,
      price: parseFloat(item.price) || 0, // Ensure numeric
      quantity: item.quantity,
      totalPrice: (parseFloat(item.price) || 0) * item.quantity, // Calculate per-item total
      sku: item.product.sku,
      category: item.product.category,
      images: item.product.images || [], // General product images
      colors: item.product.colors || [], // Full embedded colors array (e.g., [{ id: 'red', alt: 'Red color', thumb: 'red-thumb.jpg' }])
      addedAt: item.addedAt
    }));

    // Recalculate totals in case of data inconsistencies
    const total = formattedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = formattedItems.reduce((sum, item) => sum + item.quantity, 0);

    res.status(200).json({
      success: true,
      data: {
        _id: cart._id,
        user: cart.user,
        items: formattedItems,
        total: total.toFixed(2), // Format as string for currency
        itemCount,
        status: cart.status,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add item to cart
// @route   POST /api/cart/items
// @access  Private
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate product exists and is active
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (product.status !== 'Active') {
      return res.status(400).json({
        success: false,
        message: 'Product is not available'
      });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Get or create cart
    let cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    if (!cart) {
      cart = new Cart({ user: req.user.id });
    }

    // Add item to cart
    await cart.addItem(productId, quantity, product.price);

    // Populate product details
    await cart.populate('items.product', 'name price sku images category');
    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update cart item quantity
// @route   PUT /api/cart/items/:itemId
// @access  Private
exports.updateCartItem = async (req, res, next) => {
  try {
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be at least 1'
      });
    }

    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Check if item exists in cart
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Check product stock
    const product = await Product.findById(item.product);
    if (product.stock < quantity) {
      return res.status(400).json({
        success: false,
        message: `Only ${product.stock} items available in stock`
      });
    }

    // Update quantity
    await cart.updateItemQuantity(req.params.itemId, quantity);

    // Populate product details
    await cart.populate('items.product', 'name price sku images category');

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/items/:itemId
// @access  Private
exports.removeFromCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    // Check if item exists in cart
    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    // Remove item
    await cart.removeItem(req.params.itemId);

    // Populate product details
    await cart.populate('items.product', 'name price sku images category');

    res.status(200).json({
      success: true,
      data: cart
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear cart
// @route   DELETE /api/cart
// @access  Private
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    await cart.clearCart();

    res.status(200).json({
      success: true,
      message: 'Cart cleared successfully',
      data: {
        items: [],
        total: 0,
        itemCount: 0
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Checkout cart
// @route   POST /api/cart/checkout
// @access  Private
exports.checkoutCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' })
      .populate('items.product', 'name price sku stock');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Validate stock availability for all items
    for (const item of cart.items) {
      if (item.product.stock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${item.product.name}. Available: ${item.product.stock}`
        });
      }
    }

    // Update product stock
    for (const item of cart.items) {
      await Product.findByIdAndUpdate(item.product._id, {
        $inc: { stock: -item.quantity }
      });
    }

    // Mark cart as completed
    cart.status = 'completed';
    await cart.save();

    res.status(200).json({
      success: true,
      message: 'Checkout completed successfully',
      data: {
        orderId: cart._id,
        total: cart.total,
        itemCount: cart.itemCount,
        items: cart.items
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cart summary (for header/navbar)
// @route   GET /api/cart/summary
// @access  Private
exports.getCartSummary = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id, status: 'active' });

    const summary = {
      itemCount: cart ? cart.itemCount : 0,
      total: cart ? cart.total : 0
    };

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cart products by user ID (Admin only)
// @route   GET /api/cart/user/:userId
// @access  Private/Admin
exports.getCartByUserId = async (req, res, next) => {
  try {
    const { userId } = req.params;

    // Validate userId format
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format.'
      });
    }

    // Fetch cart with full product details including colors
    const cart = await Cart.findOne({ user: userId, status: 'active' })
      .populate('items.product', 'name price sku images category colors')
      .populate('user', 'name email');

    if (!cart) {
      return res.status(200).json({
        success: true,
        message: 'No active cart found for this user',
        data: {
          items: [],
          total: 0,
          itemCount: 0,
          user: { _id: userId }
        }
      });
    }

    // Format items with full product details including colors
    const formattedItems = cart.items.map(item => ({
      _id: item._id,
      productId: item.product._id,
      name: item.product.name,
      price: parseFloat(item.price) || 0,
      quantity: item.quantity,
      totalPrice: (parseFloat(item.price) || 0) * item.quantity,
      sku: item.product.sku,
      category: item.product.category,
      images: item.product.images || [],
      colors: item.product.colors || [], // Full colors array
      addedAt: item.addedAt
    }));

    // Recalculate totals
    const total = formattedItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const itemCount = formattedItems.reduce((sum, item) => sum + item.quantity, 0);

    res.status(200).json({
      success: true,
      data: {
        _id: cart._id,
        user: cart.user,
        items: formattedItems,
        total: total.toFixed(2),
        itemCount,
        status: cart.status,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error('getCartByUserId error:', error);
    next(error);
  }
};