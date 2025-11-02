const User = require('../models/User');
const Product = require('../models/Product');
const Country = require('../models/Country');
const City = require('../models/City');

// @desc    Get dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private/Admin
exports.getDashboardStats = async (req, res, next) => {
  try {
    // Get counts
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isActive: true });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    const totalProducts = await Product.countDocuments();
    const activeProducts = await Product.countDocuments({ status: 'Active' });
    const featuredProducts = await Product.countDocuments({ isFeatured: true });

    const totalCountries = await Country.countDocuments();
    const activeCountries = await Country.countDocuments({ isActive: true });

    const totalCities = await City.countDocuments();
    const activeCities = await City.countDocuments({ isActive: true });

    // Get recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const newUsers = await User.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    // Get recent products (last 30 days)
    const newProducts = await Product.countDocuments({ 
      createdAt: { $gte: thirtyDaysAgo } 
    });

    // Get product views statistics
    const productStats = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalViews: { $sum: '$views' },
          totalLikes: { $sum: '$likes' },
          avgRating: { $avg: '$rating.average' }
        }
      }
    ]);

    // Get products by category
    const productsByCategory = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get users by role
    const usersByRole = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get recent activity (last 10 users and products)
    const recentUsers = await User.find()
      .select('name email role createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentProducts = await Product.find()
      .select('name category status createdAt')
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'name');

    const stats = {
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        new: newUsers,
        byRole: usersByRole
      },
      products: {
        total: totalProducts,
        active: activeProducts,
        featured: featuredProducts,
        new: newProducts,
        byCategory: productsByCategory,
        totalViews: productStats[0]?.totalViews || 0,
        totalLikes: productStats[0]?.totalLikes || 0,
        avgRating: productStats[0]?.avgRating || 0
      },
      locations: {
        countries: {
          total: totalCountries,
          active: activeCountries
        },
        cities: {
          total: totalCities,
          active: activeCities
        }
      },
      recent: {
        users: recentUsers,
        products: recentProducts
      }
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get system info
// @route   GET /api/admin/system
// @access  Private/Admin
exports.getSystemInfo = async (req, res, next) => {
  try {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };

    res.status(200).json({
      success: true,
      data: systemInfo
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Initialize admin user
// @route   POST /api/admin/init
// @access  Public (one-time only)
exports.initializeAdmin = async (req, res, next) => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      return res.status(400).json({
        success: false,
        message: 'Admin user already exists'
      });
    }

    // Create default admin user
    const adminUser = await User.create({
      name: 'Admin User',
      email: process.env.ADMIN_EMAIL || 'admin@ekuinox.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: 'admin'
    });

    res.status(201).json({
      success: true,
      message: 'Admin user created successfully',
      data: {
        id: adminUser._id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role
      }
    });
  } catch (error) {
    next(error);
  }
};