const mongoose = require("mongoose");

const routeSchema = new mongoose.Schema({
  bus: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Bus",
    required: [true, "Please provide bus reference"],
  },
  source: {
    type: String,
    required: [true, "Please provide source location"],
    trim: true,
  },
  destination: {
    type: String,
    required: [true, "Please provide destination location"],
    trim: true,
  },
  departureTime: {
    type: String,
    required: [true, "Please provide departure time"],
    match: [
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Please provide valid time in HH:MM format",
    ],
  },
  arrivalTime: {
    type: String,
    required: [true, "Please provide arrival time"],
    match: [
      /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
      "Please provide valid time in HH:MM format",
    ],
  },
  duration: {
    type: String,
    required: [true, "Please provide journey duration"],
  },
  distance: {
    type: Number,
    required: [true, "Please provide distance in kilometers"],
    min: 1,
  },
  price: {
    type: Number,
    required: [true, "Please provide ticket price"],
    min: 0,
  },
  days: [
    {
      type: String,
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
      ],
    },
  ],
  boardingPoints: [
    {
      location: String,
      time: String,
    },
  ],
  droppingPoints: [
    {
      location: String,
      time: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster searches
routeSchema.index({ source: 1, destination: 1, isActive: 1 });

// Update timestamp on save
routeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Route", routeSchema);
