const express = require("express");
const router = express.Router();
const {
  getLegalDocument,
  createOrUpdateLegalDocument,
  getAllLegalDocuments,
  deleteLegalDocument,
} = require("../controllers/legalController");
const { protect, adminOnly } = require("../middleware/auth");

// Public routes
router.get("/:type", getLegalDocument);

// Admin routes
router.post("/", protect, adminOnly, createOrUpdateLegalDocument);
router.get("/", protect, adminOnly, getAllLegalDocuments);
router.delete("/:type", protect, adminOnly, deleteLegalDocument);

module.exports = router;
