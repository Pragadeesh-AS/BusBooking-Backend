const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Booking = require("../models/Booking");
const User = require("../models/User");
const SeatLayout = require("../models/SeatLayout");
const { AppError } = require("../middleware/errorHandler");
const { getSeatLayoutTemplate } = require("../config/seatLayoutTemplates");

// ==================== BUS MANAGEMENT ====================

// @desc    Add new bus
// @route   POST /api/admin/buses
// @access  Private/Admin
exports.addBus = async (req, res, next) => {
  try {
    const { seatType, ...busData } = req.body;

    // Get seat layout template for the selected seat type
    let layoutTemplate;
    try {
      layoutTemplate = getSeatLayoutTemplate(seatType);
    } catch (error) {
      return next(new AppError(error.message, 400));
    }

    // Auto-set totalSeats from template
    busData.totalSeats = layoutTemplate.totalSeats;
    busData.seatType = seatType;

    // Create the bus
    const bus = await Bus.create(busData);

    // Auto-generate seat layout from template
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
// @desc    Get all bus owners
// @route   GET /api/admin/busowners
// @access  Private/Admin
exports.getAllBusOwners = async (req, res, next) => {
  try {
    const busOwners = await User.find({ role: "busOwner" }).select("-password");

    res.status(200).json({
      success: true,
      count: busOwners.length,
      data: busOwners,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create bus owner account
// @route   POST /api/admin/busowners
// @access  Private/Admin
exports.createBusOwner = async (req, res, next) => {
  try {
    const { name, email, password, phone, companyName, licenseNumber, contactNumber } =
      req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("User with this email already exists", 400));
    }

    const busOwner = await User.create({
      name,
      email,
      password,
      phone,
      role: "busOwner",
      companyName,
      licenseNumber,
      contactNumber,
      isActive: true,
    });

    // Remove password from response
    busOwner.password = undefined;

    res.status(201).json({
      success: true,
      message: "Bus owner account created successfully",
      data: busOwner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update bus owner
// @route   PUT /api/admin/busowners/:id
// @access  Private/Admin
exports.updateBusOwner = async (req, res, next) => {
  try {
    const { name, phone, companyName, licenseNumber, contactNumber, isActive } =
      req.body;

    const busOwner = await User.findOneAndUpdate(
      { _id: req.params.id, role: "busOwner" },
      { name, phone, companyName, licenseNumber, contactNumber, isActive },
      { new: true, runValidators: true }
    ).select("-password");

    if (!busOwner) {
      return next(new AppError("Bus owner not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Bus owner updated successfully",
      data: busOwner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Deactivate bus owner
// @route   DELETE /api/admin/busowners/:id
// @access  Private/Admin
exports.deactivateBusOwner = async (req, res, next) => {
  try {
    const busOwner = await User.findOneAndUpdate(
      { _id: req.params.id, role: "busOwner" },
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!busOwner) {
      return next(new AppError("Bus owner not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Bus owner deactivated successfully",
      data: busOwner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Assign bus to owner
// @route   POST /api/admin/buses/:busId/assign
// @access  Private/Admin
exports.assignBusToOwner = async (req, res, next) => {
  try {
    const { ownerId } = req.body;
    const { busId } = req.params;

    // Verify the owner exists and is a bus owner
    const owner = await User.findOne({ _id: ownerId, role: "busOwner" });
    if (!owner) {
      return next(new AppError("Bus owner not found", 404));
    }

    // Update the bus
    const bus = await Bus.findByIdAndUpdate(
      busId,
      { owner: ownerId },
      { new: true }
    ).populate("owner", "name companyName");

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    res.status(200).json({
      success: true,
      message: "Bus assigned to owner successfully",
      data: bus,
    });
  } catch (error) {
    next(error);
  }
};
// @desc    Block user
// @route   PUT /api/admin/users/:id/block
// @access  Private/Admin
exports.blockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    if (user.role === "admin") {
      return next(new AppError("Cannot block admin users", 400));
    }

    user.isBlocked = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User blocked successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Unblock user
// @route   PUT /api/admin/users/:id/unblock
// @access  Private/Admin
exports.unblockUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError("User not found", 404));
    }

    user.isBlocked = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: "User unblocked successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
