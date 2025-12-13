const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Booking = require("../models/Booking");
const User = require("../models/User");
const SeatLayout = require("../models/SeatLayout");
const { AppError } = require("../middleware/errorHandler");

// ==================== BUS MANAGEMENT ====================

// @desc    Add new bus
// @route   POST /api/admin/buses
// @access  Private/Admin
exports.addBus = async (req, res, next) => {
  try {
    const bus = await Bus.create(req.body);

    res.status(201).json({
      success: true,
      message: "Bus added successfully",
      data: bus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bus
// @route   PUT /api/admin/buses/:id
// @access  Private/Admin
exports.updateBus = async (req, res, next) => {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Bus updated successfully",
      data: bus,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete bus
// @route   DELETE /api/admin/buses/:id
// @access  Private/Admin
exports.deleteBus = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    // Check if bus has active bookings
    const activeBookings = await Booking.find({
      bus: req.params.id,
      journeyDate: { $gte: new Date() },
      bookingStatus: "confirmed",
    });

    if (activeBookings.length > 0) {
      return next(new AppError("Cannot delete bus with active bookings", 400));
    }

    await bus.deleteOne();

    res.status(200).json({
      success: true,
      message: "Bus deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all buses
// @route   GET /api/admin/buses
// @access  Private/Admin
exports.getAllBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: buses.length,
      data: buses,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== ROUTE MANAGEMENT ====================

// @desc    Add new route
// @route   POST /api/admin/routes
// @access  Private/Admin
exports.addRoute = async (req, res, next) => {
  try {
    // Verify bus exists
    const bus = await Bus.findById(req.body.bus);
    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    const route = await Route.create(req.body);
    await route.populate("bus");

    res.status(201).json({
      success: true,
      message: "Route added successfully",
      data: route,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update route
// @route   PUT /api/admin/routes/:id
// @access  Private/Admin
exports.updateRoute = async (req, res, next) => {
  try {
    const route = await Route.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate("bus");

    if (!route) {
      return next(new AppError("Route not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Route updated successfully",
      data: route,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete route
// @route   DELETE /api/admin/routes/:id
// @access  Private/Admin
exports.deleteRoute = async (req, res, next) => {
  try {
    const route = await Route.findById(req.params.id);

    if (!route) {
      return next(new AppError("Route not found", 404));
    }

    // Check for active bookings
    const activeBookings = await Booking.find({
      route: req.params.id,
      journeyDate: { $gte: new Date() },
      bookingStatus: "confirmed",
    });

    if (activeBookings.length > 0) {
      return next(
        new AppError("Cannot delete route with active bookings", 400)
      );
    }

    await route.deleteOne();

    res.status(200).json({
      success: true,
      message: "Route deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all routes
// @route   GET /api/admin/routes
// @access  Private/Admin
exports.getAllRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find().populate("bus").sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== SEAT LAYOUT MANAGEMENT ====================

// @desc    Create seat layout for bus
// @route   POST /api/admin/seat-layouts
// @access  Private/Admin
exports.createSeatLayout = async (req, res, next) => {
  try {
    const { busId, layout, seats } = req.body;

    // Verify bus exists
    const bus = await Bus.findById(busId);
    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    // Check if layout already exists
    const existingLayout = await SeatLayout.findOne({ bus: busId });
    if (existingLayout) {
      return next(new AppError("Seat layout already exists for this bus", 400));
    }

    const seatLayout = await SeatLayout.create({
      bus: busId,
      layout,
      totalSeats: bus.totalSeats,
      seats,
    });

    res.status(201).json({
      success: true,
      message: "Seat layout created successfully",
      data: seatLayout,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update seat layout
// @route   PUT /api/admin/seat-layouts/:busId
// @access  Private/Admin
exports.updateSeatLayout = async (req, res, next) => {
  try {
    const seatLayout = await SeatLayout.findOneAndUpdate(
      { bus: req.params.busId },
      req.body,
      { new: true, runValidators: true }
    );

    if (!seatLayout) {
      return next(new AppError("Seat layout not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Seat layout updated successfully",
      data: seatLayout,
    });
  } catch (error) {
    next(error);
  }
};

// ==================== BOOKING MANAGEMENT ====================

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Private/Admin
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, date, busId } = req.query;

    // Build query
    let query = {};

    if (status) {
      query.bookingStatus = status;
    }

    if (date) {
      query.journeyDate = {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      };
    }

    if (busId) {
      query.bus = busId;
    }

    const bookings = await Booking.find(query)
      .populate("user", "name email phone")
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

// @desc    Get booking statistics
// @route   GET /api/admin/stats
// @access  Private/Admin
exports.getStats = async (req, res, next) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const confirmedBookings = await Booking.countDocuments({
      bookingStatus: "confirmed",
    });
    const cancelledBookings = await Booking.countDocuments({
      bookingStatus: "cancelled",
    });
    const totalRevenue = await Booking.aggregate([
      { $match: { paymentStatus: "completed" } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } },
    ]);

    const totalBuses = await Bus.countDocuments();
    const totalRoutes = await Route.countDocuments();
    const totalUsers = await User.countDocuments({ role: "user" });

    res.status(200).json({
      success: true,
      data: {
        bookings: {
          total: totalBookings,
          confirmed: confirmedBookings,
          cancelled: cancelledBookings,
        },
        revenue: totalRevenue[0]?.total || 0,
        buses: totalBuses,
        routes: totalRoutes,
        users: totalUsers,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==================== USER MANAGEMENT ====================

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find({ role: "user" })
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user status
// @route   PUT /api/admin/users/:id
// @access  Private/Admin
exports.updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    ).select("-password");

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    res.status(200).json({
      success: true,
      message: `User ${isActive ? "activated" : "deactivated"} successfully`,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
