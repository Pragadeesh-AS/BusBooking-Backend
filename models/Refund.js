const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  cancellationCharge: {
    type: Number,
    default: 0,
  },
  refundAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "approved", "processed", "rejected"],
    default: "pending",
  },
  refundMethod: {
    type: String,
    enum: ["original_payment", "wallet", "bank_transfer"],
    default: "original_payment",
  },
  processedAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Refund", refundSchema);
