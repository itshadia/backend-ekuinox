const express = require('express');
const {
  getDashboardStats,
  getSystemInfo,
  initializeAdmin
} = require('../controllers/adminController');
const { protect, adminOnly } = require('../middleware/auth');

const router = express.Router();

// Public route for initialization (one-time only)
router.post('/init', initializeAdmin);

// Protected routes (Admin only)
router.use(protect);
router.use(adminOnly);

router.get('/dashboard', getDashboardStats);
router.get('/system', getSystemInfo);

module.exports = router;