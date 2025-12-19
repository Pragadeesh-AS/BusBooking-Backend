const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  addRating,
  getBusRatings,
  getMyRatings,
  checkRating,
} = require("../controllers/ratingController");

// Protected routes (require authentication)
router.post("/", protect, addRating);
router.get("/my-ratings", protect, getMyRatings);
router.get("/check/:bookingId", protect, checkRating);

// Public routes
router.get("/bus/:busId", getBusRatings);

module.exports = router;
