const jwt = require("jsonwebtoken");
const { AppError } = require("./errorHandler");
const User = require("../models/User");

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  try {
    let token;

    // Check if token exists in headers
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Not authorized to access this route", 401));
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return next(new AppError("User no longer exists", 401));
      }

      next();
    } catch (error) {
      return next(new AppError("Not authorized to access this route", 401));
    }
  } catch (error) {
    next(error);
  }
};

// Restrict to specific roles
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError("You do not have permission to perform this action", 403)
      );
    }
    next();
  };
};

// Admin only middleware
exports.adminOnly = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("Please authenticate first", 401));
    }

    if (req.user.role !== "admin") {
      return next(new AppError("Access denied. Admin only.", 403));
    }

    next();
  } catch (error) {
    next(error);
  }
};
