const express = require("express");
const router = express.Router();
const {
  createBooking,
  getUserBookings,
  getBooking,
  cancelBooking,
  processPayment,
} = require("../controllers/bookingController");
const { generateTicket } = require("../controllers/ticketController");
const { protect } = require("../middleware/auth");

// All routes are protected (require authentication)
router.use(protect);

// Routes
router.post("/", createBooking);
router.get("/user/:userId", getUserBookings);
router.get("/:id", getBooking);
router.put("/:id/cancel", cancelBooking);
router.post("/:id/payment", processPayment);
router.get("/:id/ticket", generateTicket);

module.exports = router;
