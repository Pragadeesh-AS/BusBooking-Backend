const mongoose = require("mongoose");

const seatLayoutSchema = new mongoose.Schema({
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bus",
    required: true,
    unique: true,
  },
  layout: {
    type: String,
    enum: ["2x2", "2x3", "1x2", "2x1"],
    required: [true, "Please specify seat layout"],
    default: "2x2",
  },
  totalSeats: {
    type: Number,
    required: true,
  },
  seats: [
    {
      seatNumber: {
        type: String,
        required: true,
      },
      row: {
        type: Number,
        required: true,
      },
      column: {
        type: Number,
        required: true,
      },
      type: {
        type: String,
        enum: ["seater", "sleeper"],
        default: "seater",
      },
      position: {
        type: String,
        enum: ["window", "aisle", "middle"],
        default: "middle",
      },
      deck: {
        type: String,
        enum: ["lower", "upper"],
        default: "lower",
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Validate total seats match seats array
seatLayoutSchema.pre("save", function (next) {
  if (this.seats.length !== this.totalSeats) {
    next(new Error("Total seats must match the number of seats in layout"));
  }
  next();
});

module.exports = mongoose.model("SeatLayout", seatLayoutSchema);
