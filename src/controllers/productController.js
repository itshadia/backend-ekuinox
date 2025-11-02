const Product = require('../models/Product');
const { validationResult } = require('express-validator');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res, next) => {
  try {
    let query = {};
    
    // Build query based on filters
    if (req.query.category) {
      query.category = req.query.category;
    }
    
    if (req.query.status) {
      query.status = req.query.status;
    } else {
      // Only show active products by default for public access
      if (!req.user || req.user.role !== 'admin') {
        query.status = 'Active';
      }
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Sort
    let sortBy = {};
    if (req.query.sort) {
      const sortField = req.query.sort.replace('-', '');
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sortBy[sortField] = sortOrder;
    } else {
      sortBy.createdAt = -1; // Default: newest first
    }

    const products = await Product.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      count: products.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Increment views (only for public access)
    if (!req.user || req.user.role !== 'admin') {
      await product.incrementViews();
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new product
// @route   POST /api/products
// @access  Private/Admin
exports.createProduct = async (req, res, next) => {
  try {
    // Check for validation errors
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Validation failed',
    //     errors: errors.array()
    //   });
    // }

    // Add user to req.body
    req.body.createdBy = req.user.id;

    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Admin
exports.updateProduct = async (req, res, next) => {
  try {
    // Check for validation errors
    // const errors = validationResult(req);
    // if (!errors.isEmpty()) {
    //   return res.status(400).json({
    //     success: false,
    //     message: 'Validation failed',
    //     errors: errors.array()
    //   });
    // }

    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Add updated by user
    req.body.updatedBy = req.user.id;

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Admin
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:category
// @access  Public
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const products = await Product.getByCategory(req.params.category);

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured products
// @route   GET /api/products/featured
// @access  Public
exports.getFeaturedProducts = async (req, res, next) => {
  try {
    const products = await Product.getFeatured();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get popular products
// @route   GET /api/products/popular
// @access  Public
exports.getPopularProducts = async (req, res, next) => {
  try {
    const products = await Product.getPopular();

    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest product
// @route   GET /api/products/latest
// @access  Public
exports.getLatestProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ status: 'Active' })
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name email')
      .populate('updatedBy', 'name email')
      .populate('relatedProducts');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'No products found'
      });
    }

    // Increment views (only for public access)
    if (!req.user || req.user.role !== 'admin') {
      await product.incrementViews();
    }

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle product status
// @route   PATCH /api/products/:id/status
// @access  Private/Admin
exports.toggleProductStatus = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.status = product.status === 'Active' ? 'Inactive' : 'Active';
    product.updatedBy = req.user.id;
    await product.save();

    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};