const SavedPassenger = require("../models/SavedPassenger");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get all saved passengers for user
// @route   GET /api/saved-passengers
// @access  Private
exports.getSavedPassengers = async (req, res, next) => {
  try {
    const passengers = await SavedPassenger.find({ user: req.user._id }).sort(
      "-isDefault name"
    );

    res.status(200).json({
      success: true,
      count: passengers.length,
      data: passengers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add a saved passenger
// @route   POST /api/saved-passengers
// @access  Private
exports.addSavedPassenger = async (req, res, next) => {
  try {
    const { name, age, gender, isDefault } = req.body;

    // Check passenger limit (max 10)
    const count = await SavedPassenger.countDocuments({ user: req.user._id });
    if (count >= 10) {
      return next(new AppError("Maximum 10 saved passengers allowed", 400));
    }

    const passenger = await SavedPassenger.create({
      user: req.user._id,
      name,
      age,
      gender,
      isDefault: isDefault || false,
    });

    res.status(201).json({
      success: true,
      message: "Passenger saved successfully",
      data: passenger,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update saved passenger
// @route   PUT /api/saved-passengers/:id
// @access  Private
exports.updateSavedPassenger = async (req, res, next) => {
  try {
    let passenger = await SavedPassenger.findById(req.params.id);

    if (!passenger) {
      return next(new AppError("Passenger not found", 404));
    }

    // Check ownership
    if (passenger.user.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to update this passenger", 403));
    }

    passenger = await SavedPassenger.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    res.status(200).json({
      success: true,
      message: "Passenger updated successfully",
      data: passenger,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete saved passenger
// @route   DELETE /api/saved-passengers/:id
// @access  Private
exports.deleteSavedPassenger = async (req, res, next) => {
  try {
    const passenger = await SavedPassenger.findById(req.params.id);

    if (!passenger) {
      return next(new AppError("Passenger not found", 404));
    }

    // Check ownership
    if (passenger.user.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to delete this passenger", 403));
    }

    await passenger.deleteOne();

    res.status(200).json({
      success: true,
      message: "Passenger deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
