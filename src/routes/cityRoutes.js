// backend/routes/cityRoutes.js
const express = require("express");
const {
  createCity,
  getCities,
  getCity,
  updateCity,
  deleteCity,
  refreshCity,
} = require("../controllers/cityController");
const { protect } = require('../middleware/auth');

const router = express.Router();

// All city routes require authentication (user-specific data)
router.use(protect);

router.post("/", createCity);
router.get("/", getCities);
router.get("/:id", getCity);
router.put("/:id", updateCity);
router.delete("/:id", deleteCity);
router.post("/:id/refresh", refreshCity); // POST to refresh (could be PUT)

module.exports = router;
