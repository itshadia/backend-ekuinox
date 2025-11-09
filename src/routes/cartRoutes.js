const express = require('express');
const { body } = require('express-validator');
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  checkoutCart,
  getCartSummary,
  getCartByUserId
} = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All cart routes require authentication
router.use(protect);

// Validation middleware
const addToCartValidation = [
  body('productId')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer')
];

const updateCartItemValidation = [
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
];

// Routes
router.get('/', getCart);
router.get('/summary', getCartSummary);
router.get('/user/:userId', getCartByUserId); 
router.post('/items', addToCartValidation, addToCart);
router.put('/items/:itemId', updateCartItemValidation, updateCartItem);
router.delete('/items/:itemId', removeFromCart);
router.delete('/', clearCart);
router.post('/checkout', checkoutCart);

module.exports = router;