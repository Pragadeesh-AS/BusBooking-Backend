const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: [true, "Please provide user reference"],
  },
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bus",
    required: [true, "Please provide bus reference"],
  },
  route: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Route",
    required: [true, "Please provide route reference"],
  },
  journeyDate: {
    type: Date,
    required: [true, "Please provide journey date"],
  },
  seats: [
    {
      seatNumber: {
        type: String,
        required: true,
      },
      passengerName: {
        type: String,
        required: [true, "Please provide passenger name"],
      },
      passengerAge: {
        type: Number,
        required: [true, "Please provide passenger age"],
        min: 1,
        max: 120,
      },
      passengerGender: {
        type: String,
        enum: ["Male", "Female", "Other"],
        required: [true, "Please provide passenger gender"],
      },
    },
  ],
  boardingPoint: {
    location: String,
    time: String,
  },
  droppingPoint: {
    location: String,
    time: String,
  },
  totalAmount: {
    type: Number,
    required: [true, "Please provide total amount"],
    min: 0,
  },
  paymentStatus: {
    type: String,
    enum: ["pending", "completed", "failed", "refunded"],
    default: "pending",
  },
  paymentMethod: {
    type: String,
    enum: ["card", "upi", "netbanking", "wallet"],
    required: false,
  },
  transactionId: {
    type: String,
  },
  bookingStatus: {
    type: String,
    enum: ["confirmed", "cancelled", "completed"],
    default: "confirmed",
  },
  cancellationReason: {
    type: String,
  },
  cancelledAt: {
    type: Date,
  },
  refundAmount: {
    type: Number,
    default: 0,
  },
  bookingId: {
    type: String,
    unique: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Generate unique booking ID before saving
bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.bookingId = `BKG${timestamp}${random}`;
  }
  next();
});

// Index for faster queries
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ bookingId: 1 });
bookingSchema.index({ journeyDate: 1, bus: 1 });

module.exports = mongoose.model("Booking", bookingSchema);
