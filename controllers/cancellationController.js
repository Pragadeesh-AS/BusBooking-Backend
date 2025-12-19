const Booking = require("../models/Booking");
const Refund = require("../models/Refund");
const { AppError } = require("../middleware/errorHandler");

// Calculate refund amount based on cancellation time
const calculateRefund = (totalAmount, journeyDate, cancellationDate) => {
  const hoursBeforeJourney =
    (new Date(journeyDate) - new Date(cancellationDate)) / (1000 * 60 * 60);

  let refundPercentage = 0;
  let cancellationCharge = 0;

  if (hoursBeforeJourney >= 48) {
    // More than 48 hours before journey - 90% refund
    refundPercentage = 90;
    cancellationCharge = totalAmount * 0.1;
  } else if (hoursBeforeJourney >= 24) {
    // 24-48 hours before journey - 75% refund
    refundPercentage = 75;
    cancellationCharge = totalAmount * 0.25;
  } else if (hoursBeforeJourney >= 12) {
    // 12-24 hours before journey - 50% refund
    refundPercentage = 50;
    cancellationCharge = totalAmount * 0.5;
  } else if (hoursBeforeJourney >= 4) {
    // 4-12 hours before journey - 25% refund
    refundPercentage = 25;
    cancellationCharge = totalAmount * 0.75;
  } else {
    // Less than 4 hours - No refund
    refundPercentage = 0;
    cancellationCharge = totalAmount;
  }

  const refundAmount = (totalAmount * refundPercentage) / 100;

  return {
    refundAmount,
    cancellationCharge,
    refundPercentage,
    hoursBeforeJourney: Math.floor(hoursBeforeJourney),
  };
};

// @desc    Cancel booking
// @route   POST /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("route");

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return next(
        new AppError("You are not authorized to cancel this booking", 403)
      );
    }

    // Check if booking is already cancelled
    if (booking.bookingStatus === "cancelled") {
      return next(new AppError("Booking is already cancelled", 400));
    }

    // Check if booking is already completed
    if (booking.bookingStatus === "completed") {
      return next(new AppError("Cannot cancel completed booking", 400));
    }

    // Check if journey has already started
    const now = new Date();
    const journeyDateTime = new Date(booking.journeyDate);
    if (now > journeyDateTime) {
      return next(
        new AppError("Cannot cancel booking after journey has started", 400)
      );
    }

    // Calculate refund
    const refundDetails = calculateRefund(
      booking.totalAmount,
      booking.journeyDate,
      new Date()
    );

    // Update booking status
    booking.bookingStatus = "cancelled";
    booking.cancelledAt = new Date();
    await booking.save();

    // Create refund record
    const refund = await Refund.create({
      booking: booking._id,
      user: booking.user,
      amount: booking.totalAmount,
      cancellationCharge: refundDetails.cancellationCharge,
      refundAmount: refundDetails.refundAmount,
      status: "pending",
    });

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: {
        booking,
        refund,
        refundDetails,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get refund details
// @route   GET /api/bookings/:id/refund
// @access  Private
exports.getRefundDetails = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Check if user owns the booking
    if (booking.user.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized", 403));
    }

    // Calculate potential refund
    const refundDetails = calculateRefund(
      booking.totalAmount,
      booking.journeyDate,
      new Date()
    );

    res.status(200).json({
      success: true,
      data: refundDetails,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all refunds (Admin)
// @route   GET /api/admin/refunds
// @access  Private/Admin
exports.getAllRefunds = async (req, res, next) => {
  try {
    const refunds = await Refund.find()
      .populate("user", "name email")
      .populate("booking", "bookingId totalAmount")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: refunds.length,
      data: refunds,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process refund (Admin)
// @route   PUT /api/admin/refunds/:id/process
// @access  Private/Admin
exports.processRefund = async (req, res, next) => {
  try {
    const refund = await Refund.findById(req.params.id);

    if (!refund) {
      return next(new AppError("Refund not found", 404));
    }

    refund.status = "processed";
    refund.processedAt = new Date();
    await refund.save();

    res.status(200).json({
      success: true,
      message: "Refund processed successfully",
      data: refund,
    });
  } catch (error) {
    next(error);
  }
};
