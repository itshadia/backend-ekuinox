const express = require('express');
const { body } = require('express-validator');
const {
  getCities,
  getCity,
  getCitiesByCountry,
  createCity,
  updateCity,
  deleteCity,
  toggleCityStatus
} = require('../controllers/cityController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const cityValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('City name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('City name must be between 2 and 100 characters'),
  body('country')
    .notEmpty()
    .withMessage('Country is required')
    .isMongoId()
    .withMessage('Invalid country ID'),
  body('coordinates.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('coordinates.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('population')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Population must be a positive integer')
];

// Public routes
router.get('/', getCities);
router.get('/country/:countryId', getCitiesByCountry);
router.get('/:id', getCity);

// Protected routes (Admin only)
router.use(protect);
router.use(adminOnly);

router.post('/', cityValidation, createCity);
router.put('/:id', cityValidation, updateCity);
router.delete('/:id', deleteCity);
router.patch('/:id/status', toggleCityStatus);

module.exports = router;