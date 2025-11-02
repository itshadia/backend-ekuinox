const express = require('express');
const { body } = require('express-validator');
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus
} = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const userValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('role')
    .optional()
    .isIn(['user', 'admin'])
    .withMessage('Role must be either user or admin')
];

const userCreateValidation = [
  ...userValidation,
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
];

// All routes require authentication and admin privileges
router.use(protect);
router.use(adminOnly);

router.get('/', getUsers);
router.get('/:id', getUser);
router.post('/', userCreateValidation, createUser);
router.put('/:id', userValidation, updateUser);
router.delete('/:id', deleteUser);
router.patch('/:id/status', toggleUserStatus);

module.exports = router;