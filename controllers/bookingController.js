const Booking = require("../models/Booking");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const SeatLayout = require("../models/SeatLayout");
const Refund = require("../models/Refund");
const { AppError } = require("../middleware/errorHandler");
const { getAdjacentSeats } = require("../utils/seatHelpers");

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

    // Check if seats are already booked (include both confirmed and pending)
    const existingBookings = await Booking.find({
      bus: busId,
      route: routeId,
      journeyDate: {
        $gte: new Date(journeyDate).setHours(0, 0, 0, 0),
        $lte: new Date(journeyDate).setHours(23, 59, 59, 999),
      },
      bookingStatus: { $in: ["confirmed", "pending"] }, // Include pending bookings
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

    // Check gender restrictions
    const busType = bus.seatType || bus.busType;
    const requestedSeats = seats;

    console.log("=== GENDER RESTRICTION CHECK ===");
    console.log("Bus Type:", busType);
    console.log(
      "Requested Seats:",
      requestedSeats.map((s) => `${s.seatNumber}(${s.passengerGender})`)
    );
    console.log("Existing Bookings:", existingBookings.length);

    for (const requestedSeat of requestedSeats) {
      const adjacentSeatNumbers = getAdjacentSeats(
        requestedSeat.seatNumber,
        busType
      );

      console.log(
        `Checking seat ${requestedSeat.seatNumber} (${requestedSeat.passengerGender})`
      );
      console.log(`  Adjacent seats:`, adjacentSeatNumbers);

      // Check if any adjacent seats have gender restrictions
      for (const booking of existingBookings) {
        for (const bookedSeat of booking.seats) {
          console.log(
            `  Checking against booked seat ${bookedSeat.seatNumber}:`,
            {
              seatNumber: bookedSeat.seatNumber,
              gender: bookedSeat.passengerGender,
              hasPreference: bookedSeat.genderPreference,
              isAdjacent: adjacentSeatNumbers.includes(bookedSeat.seatNumber),
            }
          );

          // If this booked seat is adjacent to our requested seat and has gender preference
          if (
            adjacentSeatNumbers.includes(bookedSeat.seatNumber) &&
            bookedSeat.genderPreference
          ) {
            console.log(`  ⚠️ Found adjacent seat with preference!`);
            // Check if genders match
            if (bookedSeat.passengerGender !== requestedSeat.passengerGender) {
              console.log(
                `  ❌ BLOCKING: Gender mismatch (${bookedSeat.passengerGender} vs ${requestedSeat.passengerGender})`
              );
              return next(
                new AppError(
                  `Seat ${requestedSeat.seatNumber} is restricted. Seat ${bookedSeat.seatNumber} passenger has requested privacy for ${bookedSeat.passengerGender} passengers only. Please select another seat.`,
                  400
                )
              );
            } else {
              console.log(`  ✅ Same gender, allowing`);
            }
          }
        }
      }
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
      paymentMethod: req.body.paymentMethod,
      paymentDetails: req.body.paymentDetails,
      paymentStatus: "pending",
      bookingStatus: req.body.bookingStatus || "pending",
    });

    // Populate booking details
    await booking.populate([
      { path: "user", select: "name email phone" },
      {
        path: "bus",
        populate: {
          path: "owner",
          select: "name phone companyName contactNumber",
        },
      },
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
      .populate({
        path: "bus",
        populate: {
          path: "owner",
          select: "name phone companyName contactNumber",
        },
      })
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
