const express = require("express");
const router = express.Router();
const { protect, busOwnerOnly } = require("../middleware/auth");
const {
  getBusTracking,
  markPointReached,
  getRoutePoints,
} = require("../controllers/trackingController");

// Public routes - anyone can view tracking status
router.get("/bus-tracking", getBusTracking);
router.get("/route-points/:routeId", getRoutePoints);

// Protected routes - bus owner only
router.post("/mark-point", protect, busOwnerOnly, markPointReached);

module.exports = router;
