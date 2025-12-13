const express = require("express");
const router = express.Router();
const {
  searchBuses,
  getBusDetails,
  getSeatLayout,
} = require("../controllers/busController");

// Routes
router.get("/search", searchBuses);
router.get("/:id", getBusDetails);
router.get("/:busId/seats", getSeatLayout);

module.exports = router;
