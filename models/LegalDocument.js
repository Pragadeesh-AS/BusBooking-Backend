const mongoose = require("mongoose");

const legalDocumentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["terms", "privacy"],
    required: [true, "Document type is required"],
    unique: true,
  },
  title: {
    type: String,
    required: [true, "Title is required"],
  },
  content: {
    type: String,
    required: [true, "Content is required"],
  },
  version: {
    type: String,
    default: "1.0",
  },
  effectiveDate: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
});

// Update lastUpdated timestamp on save
legalDocumentSchema.pre("save", function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model("LegalDocument", legalDocumentSchema);
