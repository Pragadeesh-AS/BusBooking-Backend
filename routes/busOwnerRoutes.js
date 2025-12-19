const express = require("express");
const router = express.Router();
const { protect, busOwnerOnly } = require("../middleware/auth");
const {
  login,
  getProfile,
  updateProfile,
  getMyBuses,
  getBusDetails,
  getMyRoutes,
  getRoutesForBus,
  createRoute,
  updateRoute,
  deleteRoute,
  getBookings,
  getStatistics,
  addBus,
  updateOwnBus,
  deleteOwnBus,
  verifyPayment,
} = require("../controllers/busOwnerController");
const {
  getPassengerManifest,
  getManifestSummary,
} = require("../controllers/manifestController");

// Public routes
router.post("/login", login);

// Protected routes (Bus Owner only)
router.post("/buses", protect, busOwnerOnly, addBus); // Moved and updated route handler

router.use(protect, busOwnerOnly);

router.get("/profile", getProfile);
router.put("/profile", updateProfile);

router.get("/buses", getMyBuses);
router.get("/buses/:id", getBusDetails);
router.get("/buses/:id/routes", getRoutesForBus);
router.put("/buses/:id", updateOwnBus);
router.delete("/buses/:id", deleteOwnBus);

router.get("/routes", getMyRoutes);
router.post("/routes", createRoute);
router.put("/routes/:id", updateRoute);
router.delete("/routes/:id", deleteRoute);

router.get("/bookings", getBookings);
router.post("/bookings/:id/verify-payment", verifyPayment);
router.get("/statistics", getStatistics);

// Passenger Manifest
router.get("/manifest", getPassengerManifest);
router.get("/manifest/summary", getManifestSummary);

module.exports = router;
