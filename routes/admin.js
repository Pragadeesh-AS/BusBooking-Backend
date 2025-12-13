const express = require("express");
const router = express.Router();
const {
  addBus,
  updateBus,
  deleteBus,
  getAllBuses,
  addRoute,
  updateRoute,
  deleteRoute,
  getAllRoutes,
  createSeatLayout,
  updateSeatLayout,
  getAllBookings,
  getStats,
  getAllUsers,
  updateUserStatus,
} = require("../controllers/adminController");
const { protect, adminOnly } = require("../middleware/auth");

// All routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Bus routes
router.route("/buses").get(getAllBuses).post(addBus);

router.route("/buses/:id").put(updateBus).delete(deleteBus);

// Route routes
router.route("/routes").get(getAllRoutes).post(addRoute);

router.route("/routes/:id").put(updateRoute).delete(deleteRoute);

// Seat layout routes
router.post("/seat-layouts", createSeatLayout);
router.put("/seat-layouts/:busId", updateSeatLayout);

// Booking routes
router.get("/bookings", getAllBookings);

// Statistics
router.get("/stats", getStats);

// User management routes
router.get("/users", getAllUsers);
router.put("/users/:id", updateUserStatus);

module.exports = router;
