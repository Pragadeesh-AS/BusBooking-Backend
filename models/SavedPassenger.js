const mongoose = require("mongoose");

const savedPassengerSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  name: {
    type: String,
    required: [true, "Please provide passenger name"],
    trim: true,
  },
  age: {
    type: Number,
    required: [true, "Please provide passenger age"],
    min: [1, "Age must be at least 1"],
    max: [120, "Age cannot exceed 120"],
  },
  gender: {
    type: String,
    required: [true, "Please provide gender"],
    enum: ["Male", "Female", "Other"],
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
savedPassengerSchema.index({ user: 1, name: 1 });

// Ensure only one default passenger per user
savedPassengerSchema.pre("save", async function (next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { user: this.user, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

module.exports = mongoose.model("SavedPassenger", savedPassengerSchema);
