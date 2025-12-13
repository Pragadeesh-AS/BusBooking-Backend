const Booking = require("../models/Booking");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const SeatLayout = require("../models/SeatLayout");
const { AppError } = require("../middleware/errorHandler");

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
exports.createBooking = async (req, res, next) => {
  try {
    const { busId, routeId, journeyDate, seats, boardingPoint, droppingPoint } =
      req.body;

    // Validate required fields
    if (!busId || !routeId || !journeyDate || !seats || seats.length === 0) {
      return next(
        new AppError("Please provide all required booking details", 400)
      );
    }

    // Verify bus and route exist
    const bus = await Bus.findById(busId);
    const route = await Route.findById(routeId);

    if (!bus || !route) {
      return next(new AppError("Bus or route not found", 404));
    }

    // Check if seats are already booked
    const existingBookings = await Booking.find({
      bus: busId,
      route: routeId,
      journeyDate: {
        $gte: new Date(journeyDate).setHours(0, 0, 0, 0),
        $lte: new Date(journeyDate).setHours(23, 59, 59, 999),
      },
      bookingStatus: "confirmed",
    });

    const bookedSeatNumbers = [];
    existingBookings.forEach((booking) => {
      booking.seats.forEach((seat) => {
        bookedSeatNumbers.push(seat.seatNumber);
      });
    });

    // Check for seat conflicts
    const requestedSeatNumbers = seats.map((s) => s.seatNumber);
    const conflicts = requestedSeatNumbers.filter((seatNum) =>
      bookedSeatNumbers.includes(seatNum)
    );

    if (conflicts.length > 0) {
      return next(
        new AppError(`Seats ${conflicts.join(", ")} are already booked`, 400)
      );
    }

    // Validate seat layout
    const seatLayout = await SeatLayout.findOne({ bus: busId });
    if (seatLayout) {
      const validSeats = seatLayout.seats.map((s) => s.seatNumber);
      const invalidSeats = requestedSeatNumbers.filter(
        (seatNum) => !validSeats.includes(seatNum)
      );

      if (invalidSeats.length > 0) {
        return next(
          new AppError(`Invalid seat numbers: ${invalidSeats.join(", ")}`, 400)
        );
      }
    }

    // Calculate total amount
    const totalAmount = route.price * seats.length;

    // Create booking
    const booking = await Booking.create({
      user: req.user.id,
      bus: busId,
      route: routeId,
      journeyDate,
      seats,
      boardingPoint,
      droppingPoint,
      totalAmount,
      paymentStatus: "pending",
      bookingStatus: "confirmed",
    });

    // Populate booking details
    await booking.populate([
      { path: "user", select: "name email phone" },
      { path: "bus" },
      { path: "route" },
    ]);

    res.status(201).json({
      success: true,
      message: "Booking created successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user bookings
// @route   GET /api/bookings/user/:userId
// @access  Private
exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.params.userId;

    // Ensure user can only access their own bookings (unless admin)
    if (req.user.role !== "admin" && req.user.id !== userId) {
      return next(new AppError("Not authorized to access these bookings", 403));
    }

    const bookings = await Booking.find({ user: userId })
      .populate("bus")
      .populate("route")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
exports.getBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("bus")
      .populate("route");

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Ensure user can only access their own booking (unless admin)
    if (
      req.user.role !== "admin" &&
      booking.user._id.toString() !== req.user.id
    ) {
      return next(new AppError("Not authorized to access this booking", 403));
    }

    res.status(200).json({
      success: true,
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
exports.cancelBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Ensure user can only cancel their own booking (unless admin)
    if (req.user.role !== "admin" && booking.user.toString() !== req.user.id) {
      return next(new AppError("Not authorized to cancel this booking", 403));
    }

    // Check if already cancelled
    if (booking.bookingStatus === "cancelled") {
      return next(new AppError("Booking is already cancelled", 400));
    }

    // Check if journey date has passed
    if (new Date(booking.journeyDate) < new Date()) {
      return next(new AppError("Cannot cancel past bookings", 400));
    }

    // Calculate refund (simple logic - can be enhanced)
    const journeyDate = new Date(booking.journeyDate);
    const now = new Date();
    const hoursDifference = (journeyDate - now) / (1000 * 60 * 60);

    let refundPercentage = 0;
    if (hoursDifference >= 24) {
      refundPercentage = 90; // 90% refund if cancelled 24+ hours before
    } else if (hoursDifference >= 12) {
      refundPercentage = 50; // 50% refund if cancelled 12-24 hours before
    } else if (hoursDifference >= 6) {
      refundPercentage = 25; // 25% refund if cancelled 6-12 hours before
    }

    const refundAmount = (booking.totalAmount * refundPercentage) / 100;

    // Update booking
    booking.bookingStatus = "cancelled";
    booking.cancellationReason = req.body.reason || "User cancelled";
    booking.cancelledAt = Date.now();
    booking.refundAmount = refundAmount;
    booking.paymentStatus =
      refundAmount > 0 ? "refunded" : booking.paymentStatus;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Booking cancelled successfully",
      data: {
        booking,
        refundAmount,
        refundPercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Process payment (placeholder)
// @route   POST /api/bookings/:id/payment
// @access  Private
exports.processPayment = async (req, res, next) => {
  try {
    const { paymentMethod, transactionId } = req.body;

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Ensure user can only pay for their own booking
    if (booking.user.toString() !== req.user.id) {
      return next(new AppError("Not authorized to process this payment", 403));
    }

    // Check if already paid
    if (booking.paymentStatus === "completed") {
      return next(new AppError("Payment already completed", 400));
    }

    // Update payment status (In real app, integrate with payment gateway)
    booking.paymentStatus = "completed";
    booking.paymentMethod = paymentMethod;
    booking.transactionId = transactionId || `TXN${Date.now()}`;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Payment processed successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
