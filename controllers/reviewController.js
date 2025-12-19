const Review = require("../models/Review");
const Booking = require("../models/Booking");
const Bus = require("../models/Bus");
const { AppError } = require("../middleware/errorHandler");

// @desc    Add a review for a bus
// @route   POST /api/reviews
// @access  Private
exports.addReview = async (req, res, next) => {
  try {
    const { busId, bookingId, rating, comment } = req.body;

    // Validate required fields
    if (!busId || !bookingId || !rating || !comment) {
      return next(new AppError("Please provide all required fields", 400));
    }

    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to review this booking", 403));
    }

    // Check if journey is completed
    if (new Date(booking.journeyDate) > new Date()) {
      return next(new AppError("Cannot review before journey completion", 400));
    }

    // Check for duplicate review
    const existingReview = await Review.findOne({
      user: req.user._id,
      booking: bookingId,
    });

    if (existingReview) {
      return next(new AppError("You have already reviewed this booking", 400));
    }

    // Create review
    const review = await Review.create({
      user: req.user._id,
      bus: busId,
      booking: bookingId,
      rating,
      comment,
    });

    // Update bus average rating
    await updateBusRating(busId);

    // Populate user details
    await review.populate("user", "name");

    res.status(201).json({
      success: true,
      message: "Review added successfully",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get reviews for a bus
// @route   GET /api/reviews/bus/:busId
// @access  Public
exports.getBusReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({
      bus: req.params.busId,
      isApproved: true,
    })
      .populate("user", "name")
      .sort("-createdAt");

    // Calculate rating distribution
    const ratingDistribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    const averageRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 0;

    res.status(200).json({
      success: true,
      count: reviews.length,
      averageRating: averageRating.toFixed(1),
      ratingDistribution,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's reviews
// @route   GET /api/reviews/my-reviews
// @access  Private
exports.getMyReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate("bus", "name busNumber")
      .populate("booking", "journeyDate")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bus average rating
// @access  Helper function
const updateBusRating = async (busId) => {
  const reviews = await Review.find({ bus: busId, isApproved: true });

  if (reviews.length > 0) {
    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await Bus.findByIdAndUpdate(busId, {
      rating: averageRating.toFixed(1),
      reviewCount: reviews.length,
    });
  } else {
    await Bus.findByIdAndUpdate(busId, {
      rating: 0,
      reviewCount: 0,
    });
  }
};

// @desc    Get all reviews (Admin)
// @route   GET /api/admin/reviews
// @access  Private/Admin
exports.getAllReviews = async (req, res, next) => {
  try {
    const { status } = req.query; // approved, pending, reported

    let filter = {};
    if (status === "pending") filter.isApproved = false;
    if (status === "reported") filter.isReported = true;

    const reviews = await Review.find(filter)
      .populate("user", "name email")
      .populate("bus", "name busNumber")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve review (Admin)
// @route   PUT /api/admin/reviews/:id/approve
// @access  Private/Admin
exports.approveReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    review.isApproved = true;
    await review.save();

    // Update bus rating
    await updateBusRating(review.bus);

    res.status(200).json({
      success: true,
      message: "Review approved",
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete review (Admin)
// @route   DELETE /api/admin/reviews/:id
// @access  Private/Admin
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return next(new AppError("Review not found", 404));
    }

    const busId = review.bus;
    await review.deleteOne();

    // Update bus rating after deletion
    await updateBusRating(busId);

    res.status(200).json({
      success: true,
      message: "Review deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
