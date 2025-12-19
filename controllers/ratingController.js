const Rating = require("../models/Rating");
const Booking = require("../models/Booking");
const Bus = require("../models/Bus");
const { AppError } = require("../middleware/errorHandler");

// @desc    Add a rating for a bus
// @route   POST /api/ratings
// @access  Private
exports.addRating = async (req, res, next) => {
  try {
    const { busId, bookingId, rating } = req.body;

    // Validate required fields
    if (!busId || !bookingId || !rating) {
      return next(new AppError("Please provide all required fields", 400));
    }

    // Validate rating value
    if (rating < 1 || rating > 5) {
      return next(new AppError("Rating must be between 1 and 5", 400));
    }

    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to rate this booking", 403));
    }

    // Check if booking is completed
    if (booking.bookingStatus !== "completed") {
      return next(new AppError("You can only rate completed trips", 400));
    }

    // Check for duplicate rating
    const existingRating = await Rating.findOne({
      user: req.user._id,
      booking: bookingId,
    });

    if (existingRating) {
      // Update existing rating
      existingRating.rating = rating;
      await existingRating.save();

      return res.status(200).json({
        success: true,
        message: "Rating updated successfully",
        data: existingRating,
      });
    }

    // Create new rating
    const newRating = await Rating.create({
      user: req.user._id,
      bus: busId,
      booking: bookingId,
      rating,
    });

    res.status(201).json({
      success: true,
      message: "Rating added successfully",
      data: newRating,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get ratings for a bus
// @route   GET /api/ratings/bus/:busId
// @access  Public
exports.getBusRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find({
      bus: req.params.busId,
    })
      .populate("user", "name")
      .sort("-createdAt");

    // Calculate rating distribution
    const ratingDistribution = {
      5: ratings.filter((r) => r.rating === 5).length,
      4: ratings.filter((r) => r.rating === 4).length,
      3: ratings.filter((r) => r.rating === 3).length,
      2: ratings.filter((r) => r.rating === 2).length,
      1: ratings.filter((r) => r.rating === 1).length,
    };

    const averageRating =
      ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    res.status(200).json({
      success: true,
      count: ratings.length,
      averageRating: Math.round(averageRating * 10) / 10,
      ratingDistribution,
      data: ratings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's ratings
// @route   GET /api/ratings/my-ratings
// @access  Private
exports.getMyRatings = async (req, res, next) => {
  try {
    const ratings = await Rating.find({ user: req.user._id })
      .populate("bus", "name busNumber")
      .populate("booking", "journeyDate")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: ratings.length,
      data: ratings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check if user has rated a booking
// @route   GET /api/ratings/check/:bookingId
// @access  Private
exports.checkRating = async (req, res, next) => {
  try {
    const rating = await Rating.findOne({
      user: req.user._id,
      booking: req.params.bookingId,
    });

    res.status(200).json({
      success: true,
      hasRated: !!rating,
      rating: rating ? rating.rating : null,
    });
  } catch (error) {
    next(error);
  }
};
