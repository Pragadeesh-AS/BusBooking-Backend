const User = require("../models/User");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Booking = require("../models/Booking");
const SeatLayout = require("../models/SeatLayout");
const { AppError } = require("../middleware/errorHandler");
const { getSeatLayoutTemplate } = require("../config/seatLayoutTemplates");

// @desc    Bus Owner Login
// @route   POST /api/busowner/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError("Please provide email and password", 400));
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || user.role !== "busOwner") {
      return next(new AppError("Invalid credentials", 401));
    }

    if (!user.isActive) {
      return next(new AppError("Account is deactivated. Contact admin.", 403));
    }

    // Check if bus owner is approved
    if (user.status !== "approved") {
      let message = "Your account is pending admin approval.";
      if (user.status === "rejected") {
        message = `Your application was rejected. Reason: ${
          user.rejectionReason || "Please contact admin for details"
        }`;
      }
      return next(new AppError(message, 403));
    }

    const isPasswordMatch = await user.matchPassword(password);

    if (!isPasswordMatch) {
      return next(new AppError("Invalid credentials", 401));
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.companyName,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Bus Owner Profile
// @route   GET /api/busowner/profile
// @access  Private (Bus Owner)
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Bus Owner Profile
// @route   PUT /api/busowner/profile
// @access  Private (Bus Owner)
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, phone, companyName, contactNumber } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, companyName, contactNumber },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Bus Owner's Buses
// @route   GET /api/busowner/buses
// @access  Private (Bus Owner)
exports.getMyBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find({ owner: req.user._id, isActive: true });

    res.status(200).json({
      success: true,
      count: buses.length,
      data: buses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Bus Details
// @route   GET /api/busowner/buses/:id
// @access  Private (Bus Owner)
exports.getBusDetails = async (req, res, next) => {
  try {
    const bus = await Bus.findOne({
      _id: req.params.id,
      owner: req.user._id,
    });

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    res.status(200).json({ success: true, data: bus });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Routes for Owned Buses
// @route   GET /api/busowner/routes
// @access  Private (Bus Owner)
exports.getMyRoutes = async (req, res, next) => {
  try {
    const ownedBuses = await Bus.find({ owner: req.user._id }).select("_id");
    const busIds = ownedBuses.map((bus) => bus._id);

    const routes = await Route.find({ bus: { $in: busIds } }).populate(
      "bus",
      "name busNumber"
    );

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create Route
// @route   POST /api/busowner/routes
// @access  Private (Bus Owner)
exports.createRoute = async (req, res, next) => {
  try {
    const { bus: busId } = req.body;

    // Verify the bus belongs to this owner
    const bus = await Bus.findOne({ _id: busId, owner: req.user._id });

    if (!bus) {
      return next(
        new AppError("You can only create routes for your buses", 403)
      );
    }

    const route = await Route.create(req.body);

    res.status(201).json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Route
// @route   PUT /api/busowner/routes/:id
// @access  Private (Bus Owner)
exports.updateRoute = async (req, res, next) => {
  try {
    let route = await Route.findById(req.params.id).populate("bus");

    if (!route) {
      return next(new AppError("Route not found", 404));
    }

    // Check if the bus belongs to this owner
    if (route.bus.owner.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to update this route", 403));
    }

    route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: route,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete Route
// @route   DELETE /api/busowner/routes/:id
// @access  Private (Bus Owner)
exports.deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id).populate("bus");

    if (!route) {
      return next(new AppError("Route not found", 404));
    }

    // Check if the bus belongs to this owner
    if (route.bus.owner.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to delete this route", 403));
    }

    await route.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Bookings for Owned Buses
// @route   GET /api/busowner/bookings
// @access  Private (Bus Owner)
exports.getBookings = async (req, res, next) => {
  try {
    const ownedBuses = await Bus.find({
      owner: req.user._id,
      isActive: true,
    }).select("_id");
    const busIds = ownedBuses.map((bus) => bus._id);

    const routes = await Route.find({ bus: { $in: busIds } }).select("_id");
    const routeIds = routes.map((route) => route._id);

    const bookings = await Booking.find({ route: { $in: routeIds } })
      .populate("user", "name email phone")
      .populate("route", "source destination departureTime arrivalTime")
      .populate("bus", "name busNumber")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Statistics for Owned Buses
// @route   GET /api/busowner/statistics
// @access  Private (Bus Owner)
exports.getStatistics = async (req, res, next) => {
  try {
    const ownedBuses = await Bus.find({
      owner: req.user._id,
      isActive: true,
    }).select("_id");
    const busIds = ownedBuses.map((bus) => bus._id);

    const routes = await Route.find({ bus: { $in: busIds } }).select("_id");
    const routeIds = routes.map((route) => route._id);

    const bookings = await Booking.find({ route: { $in: routeIds } });

    // Calculate statistics
    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );
    const confirmedBookings = bookings.filter(
      (b) => b.bookingStatus === "confirmed"
    ).length;

    // Today's bookings
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayBookings = bookings.filter(
      (b) => new Date(b.createdAt) >= today
    ).length;

    res.status(200).json({
      success: true,
      data: {
        totalBuses: ownedBuses.length,
        totalRoutes: routes.length,
        totalBookings,
        confirmedBookings,
        todayBookings,
        totalRevenue,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add own bus (Bus Owner)
// @route   POST /api/busowner/buses
// @access  Private/BusOwner
exports.addBus = async (req, res, next) => {
  try {
    const { busNumber, seatType, ...busData } = req.body;

    if (!busData.name || !busNumber) {
      return next(new AppError("Bus name and bus number are required", 400));
    }

    let layoutTemplate;
    try {
      layoutTemplate = getSeatLayoutTemplate(seatType);
    } catch (error) {
      return next(new AppError(error.message, 400));
    }

    // Auto-set owner to logged-in bus owner
    busData.owner = req.user._id;
    busData.totalSeats = layoutTemplate.totalSeats;
    busData.seatType = seatType;
    busData.busNumber = busNumber;

    // Create bus
    const bus = await Bus.create(busData);

    // Auto-generate seat layout
    await SeatLayout.create({
      bus: bus._id,
      layout: layoutTemplate.layout,
      totalSeats: layoutTemplate.totalSeats,
      seats: layoutTemplate.seats,
    });

    res.status(201).json({
      success: true,
      message: `Bus added successfully with ${seatType} seat layout (${layoutTemplate.totalSeats} seats)`,
      data: bus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update own bus
// @route   PUT /api/busowner/buses/:id
// @access  Private/BusOwner
exports.updateOwnBus = async (req, res, next) => {
  try {
    let bus = await Bus.findById(req.params.id);

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    // Check ownership
    if (bus.owner.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to update this bus", 403));
    }

    // Update bus
    bus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Bus updated successfully",
      data: bus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete own bus (soft delete)
// @route   DELETE /api/busowner/buses/:id
// @access  Private/BusOwner
exports.deleteOwnBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    // Check ownership
    if (bus.owner.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to delete this bus", 403));
    }

    // Check if bus has active routes
    const activeRoutes = await Route.find({ bus: bus._id, isActive: true });
    if (activeRoutes.length > 0) {
      return next(
        new AppError(
          "Cannot delete bus with active routes. Please deactivate routes first.",
          400
        )
      );
    }

    // Soft delete
    bus.isActive = false;
    await bus.save();

    res.status(200).json({
      success: true,
      message: "Bus deleted successfully",
      data: bus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get own buses
// @route   GET /api/busowner/buses
// @access  Private/BusOwner
exports.getOwnBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find({ owner: req.user._id, isActive: true }).sort(
      "-createdAt"
    );

    res.status(200).json({
      success: true,
      count: buses.length,
      data: buses,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify Payment for Booking
// @route   POST /api/busowner/bookings/:id/verify-payment
// @access  Private (Bus Owner)
exports.verifyPayment = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("bus")
      .populate("route");

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Check if the bus belongs to this owner
    const bus = await Bus.findById(booking.bus._id);
    if (bus.owner.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to verify this booking", 403));
    }

    // Check if already verified
    if (booking.bookingStatus === "confirmed") {
      return next(new AppError("Booking is already confirmed", 400));
    }

    // Update booking status
    booking.bookingStatus = "confirmed";
    booking.paymentStatus = "completed";
    booking.verifiedAt = Date.now();
    booking.verifiedBy = req.user._id;

    await booking.save();

    res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get routes for a specific bus
// @route   GET /api/busowner/buses/:id/routes
// @access  Private (Bus Owner)
exports.getRoutesForBus = async (req, res, next) => {
  try {
    const busId = req.params.id;

    // Verify bus belongs to this owner
    const bus = await Bus.findById(busId);
    if (!bus) {
      return next(new AppError('Bus not found', 404));
    }

    if (bus.owner.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to access this bus', 403));
    }

    // Find all routes for this bus
    const routes = await Route.find({ bus: busId });

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    next(error);
  }
};
