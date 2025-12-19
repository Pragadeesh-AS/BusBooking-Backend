const mongoose = require("mongoose");

const busSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: false, // Optional for now to avoid breaking existing buses
  },
  name: {
    type: String,
    required: [true, "Please provide bus name"],
    trim: true,
  },
  days: {
    type: [String],
    enum: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    default: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
    validate: {
      validator: function (v) {
        return v && v.length > 0;
      },
      message: "At least one operating day must be selected",
    },
  },
  busNumber: {
    type: String,
    required: [true, "Please provide bus number"],
    unique: true,
    uppercase: true,
    trim: true,
    validate: {
      validator: function (v) {
        // Format: AA00AA0000 (2 letters, 2 digits, 2 letters, 4 digits)
        return /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/.test(v);
      },
      message: (props) =>
        `${props.value} is not a valid bus number! Format should be AA00AA0000 (e.g., TN01AB1234)`,
    },
  },
  busType: {
    type: String,
    enum: ["AC", "Non-AC", "Volvo", "Luxury"],
    required: [true, "Please specify bus type"],
  },
  seatType: {
    type: String,
    enum: ["Seater", "Semi-Sleeper", "Sleeper"],
    required: [true, "Please specify seat type"],
  },
  totalSeats: {
    type: Number,
    required: [true, "Please specify total seats"],
    min: 1,
    max: 60,
  },
  amenities: [
    {
      type: String,
      enum: [
        "WiFi",
        "Charging Point",
        "Water Bottle",
        "Blanket",
        "Pillow",
        "TV",
        "Reading Light",
        "Emergency Exit",
        "GPS Tracking",
      ],
    },
  ],
  operator: {
    type: String,
    required: [true, "Please provide operator name"],
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  images: [
    {
      type: String,
    },
  ],
  isActive: {
    type: Boolean,
    default: true,
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },
  reviewCount: {
    type: Number,
    default: 0,
  },
  // Live tracking for bus journeys
  liveTracking: [
    {
      routeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Route",
        required: true,
      },
      journeyDate: {
        type: Date,
        required: true,
      },
      status: {
        type: String,
        enum: ["scheduled", "in_transit", "completed"],
        default: "scheduled",
      },
      pointsReached: [
        {
          location: {
            type: String,
            required: true,
          },
          time: {
            type: String,
            required: true,
          },
          type: {
            type: String,
            enum: ["boarding", "dropping"],
            required: true,
          },
          markedAt: {
            type: Date,
            default: Date.now,
          },
          markedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
        },
      ],
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure virtuals are included when converting to JSON
busSchema.set("toJSON", { virtuals: true });
busSchema.set("toObject", { virtuals: true });

// Update timestamp on save
busSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Bus", busSchema);
