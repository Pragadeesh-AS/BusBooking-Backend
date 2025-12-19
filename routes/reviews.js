const express = require("express");
const router = express.Router();
const {
  addReview,
  getBusReviews,
  getMyReviews,
} = require("../controllers/reviewController");
const { protect } = require("../middleware/auth");

// Public routes
router.get("/bus/:busId", getBusReviews);

// Protected routes
router.use(protect);
router.post("/", addReview);
router.get("/my-reviews", getMyReviews);

module.exports = router;
