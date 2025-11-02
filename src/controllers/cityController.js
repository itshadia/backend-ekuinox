const City = require('../models/City');
const Country = require('../models/Country');
const { validationResult } = require('express-validator');

// @desc    Get all cities
// @route   GET /api/cities
// @access  Public
exports.getCities = async (req, res, next) => {
  try {
    let query = {};
    
    if (req.query.country) {
      query.country = req.query.country;
    }
    
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    } else {
      // Show only active cities by default for public access
      if (!req.user || req.user.role !== 'admin') {
        query.isActive = true;
      }
    }

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Sort
    let sortBy = {};
    if (req.query.sort) {
      const sortField = req.query.sort.replace('-', '');
      const sortOrder = req.query.sort.startsWith('-') ? -1 : 1;
      sortBy[sortField] = sortOrder;
    } else {
      sortBy.name = 1; // Default: alphabetical
    }

    const cities = await City.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    const total = await City.countDocuments(query);

    res.status(200).json({
      success: true,
      count: cities.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: cities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single city
// @route   GET /api/cities/:id
// @access  Public
exports.getCity = async (req, res, next) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    res.status(200).json({
      success: true,
      data: city
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get cities by country
// @route   GET /api/cities/country/:countryId
// @access  Public
exports.getCitiesByCountry = async (req, res, next) => {
  try {
    const country = await Country.findById(req.params.countryId);
    
    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }

    let query = { country: req.params.countryId };
    
    // Show only active cities by default for public access
    if (!req.user || req.user.role !== 'admin') {
      query.isActive = true;
    }

    const cities = await City.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: cities.length,
      data: cities
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new city
// @route   POST /api/cities
// @access  Private/Admin
exports.createCity = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Check if country exists
    const country = await Country.findById(req.body.country);
    if (!country) {
      return res.status(400).json({
        success: false,
        message: 'Country not found'
      });
    }

    const city = await City.create(req.body);

    res.status(201).json({
      success: true,
      data: city
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update city
// @route   PUT /api/cities/:id
// @access  Private/Admin
exports.updateCity = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    let city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    // Check if country exists (if country is being updated)
    if (req.body.country) {
      const country = await Country.findById(req.body.country);
      if (!country) {
        return res.status(400).json({
          success: false,
          message: 'Country not found'
        });
      }
    }

    city = await City.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: city
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete city
// @route   DELETE /api/cities/:id
// @access  Private/Admin
exports.deleteCity = async (req, res, next) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    await City.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'City deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle city status
// @route   PATCH /api/cities/:id/status
// @access  Private/Admin
exports.toggleCityStatus = async (req, res, next) => {
  try {
    const city = await City.findById(req.params.id);

    if (!city) {
      return res.status(404).json({
        success: false,
        message: 'City not found'
      });
    }

    city.isActive = !city.isActive;
    await city.save();

    res.status(200).json({
      success: true,
      data: city
    });
  } catch (error) {
    next(error);
  }
};