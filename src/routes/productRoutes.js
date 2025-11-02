const express = require('express');
const { body } = require('express-validator');
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getFeaturedProducts,
  getPopularProducts,
  getLatestProduct,
  toggleProductStatus
} = require('../controllers/productController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const productValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Product name must be between 2 and 100 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Product description is required')
    .isLength({ min: 10, max: 1000 })
    .withMessage('Product description must be between 10 and 1000 characters'),
  body('price')
    .notEmpty()
    .withMessage('Product price is required'),
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('Product SKU is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Product SKU must be between 3 and 20 characters'),
  body('stock')
    .isInt({ min: 0 })
    .withMessage('Stock must be a non-negative integer'),
  body('category')
    .isIn(['Watch', 'Electronics', 'Accessories'])
    .withMessage('Category must be Watch, Electronics, or Accessories')
];

// Public routes
router.get('/featured', getFeaturedProducts);
router.get('/popular', getPopularProducts);
router.get('/latest', getLatestProduct);
router.get('/category/:category', getProductsByCategory);
router.get('/', getProducts);
router.get('/:id', getProduct);

// Protected routes (Admin only)
router.use(protect);
router.use(adminOnly);

router.post('/', productValidation, createProduct);
router.put('/:id', productValidation, updateProduct);
router.delete('/:id', deleteProduct);
router.patch('/:id/status', toggleProductStatus);

module.exports = router;