const express = require("express");
const router = express.Router();
const {
  getSavedPassengers,
  addSavedPassenger,
  updateSavedPassenger,
  deleteSavedPassenger,
} = require("../controllers/savedPassengerController");
const { protect } = require("../middleware/auth");

// All routes require authentication
router.use(protect);

router.route("/").get(getSavedPassengers).post(addSavedPassenger);

router.route("/:id").put(updateSavedPassenger).delete(deleteSavedPassenger);

module.exports = router;
