const express = require("express");
const router = express.Router();
const {
  updateProfile,
  changePassword,
  getProfile,
} = require("../controllers/userController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

// Routes
router.get("/profile", getProfile);
router.put("/profile", updateProfile);
router.put("/change-password", changePassword);

module.exports = router;
