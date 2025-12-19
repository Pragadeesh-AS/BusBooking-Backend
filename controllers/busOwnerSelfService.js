const Bus = require("../models/Bus");
const Route = require("../models/Route");
const SeatLayout = require("../models/SeatLayout");
const { AppError } = require("../middleware/errorHandler");
const { getSeatLayoutTemplate } = require("../config/seatLayoutTemplates");

// @desc    Add own bus (Bus Owner)
// @route   POST /api/busowner/buses
// @access  Private/BusOwner
exports.addOwnBus = async (req, res, next) => {
  try {
    const { seatType, ...busData } = req.body;

    // Get seat layout template
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
    const buses = await Bus.find({ owner: req.user._id }).sort("-createdAt");

    res.status(200).json({
      success: true,
      count: buses.length,
      data: buses,
    });
  } catch (error) {
    next(error);
  }
};
