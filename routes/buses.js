const express = require("express");
const router = express.Router();
const {
  searchBuses,
  getBusDetails,
  getSeatLayout,
  getFeaturedBuses,
} = require("../controllers/busController");

// Routes
router.get("/", getFeaturedBuses);
router.get("/search", searchBuses);
router.get("/:busId/seats", getSeatLayout); // More specific route first
router.get("/:id", getBusDetails); // Generic route last

module.exports = router;
