const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema({
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
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Booking",
    required: [true, "Please provide booking reference"],
  },
  rating: {
    type: Number,
    required: [true, "Please provide a rating"],
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    required: [true, "Please provide a comment"],
    trim: true,
    maxlength: [500, "Comment cannot exceed 500 characters"],
  },
  isApproved: {
    type: Boolean,
    default: true, // Auto-approve reviews by default
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
reviewSchema.index({ bus: 1, createdAt: -1 });
reviewSchema.index({ user: 1, bus: 1 }, { unique: true });

// Static method to calculate average rating
reviewSchema.statics.calculateAverageRating = async function (busId) {
  const stats = await this.aggregate([
    {
      $match: { bus: busId },
    },
    {
      $group: {
        _id: "$bus",
        averageRating: { $avg: "$rating" },
        reviewCount: { $sum: 1 },
      },
    },
  ]);

  if (stats.length > 0) {
    await mongoose.model("Bus").findByIdAndUpdate(busId, {
      rating: Math.round(stats[0].averageRating * 10) / 10,
      reviewCount: stats[0].reviewCount,
    });
  } else {
    await mongoose.model("Bus").findByIdAndUpdate(busId, {
      rating: 0,
      reviewCount: 0,
    });
  }
};

// Update bus rating after save
reviewSchema.post("save", function () {
  this.constructor.calculateAverageRating(this.bus);
});

// Update bus rating after remove
reviewSchema.post("remove", function () {
  this.constructor.calculateAverageRating(this.bus);
});

module.exports = mongoose.model("Review", reviewSchema);
