const User = require("../models/User");
const { AppError } = require("../middleware/errorHandler");

// @desc    Public bus owner registration
// @route   POST /api/auth/register-busowner
// @access  Public
exports.registerBusOwner = async (req, res, next) => {
  try {
    const { name, email, password, phone, companyName, licenseNumber } =
      req.body;

    // Validate required fields
    if (!name || !email || !password || !phone || !companyName) {
      return next(new AppError("Please provide all required fields", 400));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError("Email already registered", 400));
    }

    // Create bus owner with pending status
    const busOwner = await User.create({
      name,
      email,
      password,
      phone,
      companyName,
      licenseNumber,
      role: "busOwner",
      status: "pending", // Awaits admin approval
    });

    res.status(201).json({
      success: true,
      message:
        "Registration successful! Your application is pending admin approval. You will be notified once approved.",
      data: {
        id: busOwner._id,
        name: busOwner.name,
        email: busOwner.email,
        status: busOwner.status,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all pending bus owner applications (Admin)
// @route   GET /api/admin/pending-operators
// @access  Private/Admin
exports.getPendingOperators = async (req, res, next) => {
  try {
    const pendingOperators = await User.find({
      role: "busOwner",
      status: "pending",
    })
      .select("-password")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: pendingOperators.length,
      data: pendingOperators,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Approve bus owner application (Admin)
// @route   PUT /api/admin/operators/:id/approve
// @access  Private/Admin
exports.approveBusOwner = async (req, res, next) => {
  try {
    const busOwner = await User.findById(req.params.id);

    if (!busOwner) {
      return next(new AppError("Bus owner not found", 404));
    }

    if (busOwner.role !== "busOwner") {
      return next(new AppError("User is not a bus owner", 400));
    }

    if (busOwner.status === "approved") {
      return next(new AppError("Bus owner is already approved", 400));
    }

    busOwner.status = "approved";
    busOwner.rejectionReason = undefined; // Clear any previous rejection reason
    await busOwner.save();

    res.status(200).json({
      success: true,
      message: "Bus owner approved successfully",
      data: busOwner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reject bus owner application (Admin)
// @route   PUT /api/admin/operators/:id/reject
// @access  Private/Admin
exports.rejectBusOwner = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const busOwner = await User.findById(req.params.id);

    if (!busOwner) {
      return next(new AppError("Bus owner not found", 404));
    }

    if (busOwner.role !== "busOwner") {
      return next(new AppError("User is not a bus owner", 400));
    }

    busOwner.status = "rejected";
    busOwner.rejectionReason = reason || "Application rejected by admin";
    await busOwner.save();

    res.status(200).json({
      success: true,
      message: "Bus owner application rejected",
      data: busOwner,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all bus owners (approved/pending/rejected) (Admin)
// @route   GET /api/admin/operators
// @access  Private/Admin
exports.getAllOperators = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { role: "busOwner" };

    if (status) {
      filter.status = status;
    }

    const operators = await User.find(filter)
      .select("-password")
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: operators.length,
      data: operators,
    });
  } catch (error) {
    next(error);
  }
};
