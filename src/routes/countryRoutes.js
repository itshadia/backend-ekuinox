const express = require('express');
const { body } = require('express-validator');
const {
  getCountries,
  getCountry,
  createCountry,
  updateCountry,
  deleteCountry,
  toggleCountryStatus
} = require('../controllers/countryController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const countryValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Country name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Country name must be between 2 and 100 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Country code is required')
    .isLength({ min: 2, max: 3 })
    .withMessage('Country code must be 2 or 3 characters')
    .isAlpha()
    .withMessage('Country code must contain only letters'),
  body('continent')
    .isIn(['Africa', 'Antarctica', 'Asia', 'Europe', 'North America', 'Oceania', 'South America'])
    .withMessage('Invalid continent')
];

// Public routes
router.get('/', getCountries);
router.get('/:id', getCountry);

// Protected routes (Admin only)
router.use(protect);
router.use(adminOnly);

router.post('/', countryValidation, createCountry);
router.put('/:id', countryValidation, updateCountry);
router.delete('/:id', deleteCountry);
router.patch('/:id/status', toggleCountryStatus);

module.exports = router;