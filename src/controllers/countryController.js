const Country = require('../models/Country');
const { validationResult } = require('express-validator');

// @desc    Get all countries
// @route   GET /api/countries
// @access  Public
exports.getCountries = async (req, res, next) => {
  try {
    let query = {};
    
    if (req.query.continent) {
      query.continent = req.query.continent;
    }
    
    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    } else {
      // Show only active countries by default for public access
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

    const countries = await Country.find(query)
      .sort(sortBy)
      .skip(skip)
      .limit(limit);

    const total = await Country.countDocuments(query);

    res.status(200).json({
      success: true,
      count: countries.length,
      total,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      data: countries
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single country
// @route   GET /api/countries/:id
// @access  Public
exports.getCountry = async (req, res, next) => {
  try {
    const country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }

    res.status(200).json({
      success: true,
      data: country
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new country
// @route   POST /api/countries
// @access  Private/Admin
exports.createCountry = async (req, res, next) => {
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

    const country = await Country.create(req.body);

    res.status(201).json({
      success: true,
      data: country
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update country
// @route   PUT /api/countries/:id
// @access  Private/Admin
exports.updateCountry = async (req, res, next) => {
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

    let country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }

    country = await Country.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: country
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete country
// @route   DELETE /api/countries/:id
// @access  Private/Admin
exports.deleteCountry = async (req, res, next) => {
  try {
    const country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }

    await Country.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Country deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle country status
// @route   PATCH /api/countries/:id/status
// @access  Private/Admin
exports.toggleCountryStatus = async (req, res, next) => {
  try {
    const country = await Country.findById(req.params.id);

    if (!country) {
      return res.status(404).json({
        success: false,
        message: 'Country not found'
      });
    }

    country.isActive = !country.isActive;
    await country.save();

    res.status(200).json({
      success: true,
      data: country
    });
  } catch (error) {
    next(error);
  }
};