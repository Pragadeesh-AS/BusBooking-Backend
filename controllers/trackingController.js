const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Booking = require("../models/Booking");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get live tracking status for a bus journey
// @route   GET /api/tracking/bus-tracking
// @access  Public
exports.getBusTracking = async (req, res, next) => {
  try {
    const { busId, routeId, date } = req.query;

    if (!busId || !routeId || !date) {
      return next(new AppError("Please provide busId, routeId, and date", 400));
    }

    // Find bus and populate route
    const bus = await Bus.findById(busId).populate("liveTracking.routeId");

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    // Parse journey date
    const journeyDate = new Date(date);
    journeyDate.setHours(0, 0, 0, 0);

    // Find tracking entry for this specific journey
    const tracking = bus.liveTracking.find((t) => {
      const tDate = new Date(t.journeyDate);
      tDate.setHours(0, 0, 0, 0);

      return (
        t.routeId._id.toString() === routeId &&
        tDate.getTime() === journeyDate.getTime()
      );
    });

    // If no tracking found, return empty tracking data
    if (!tracking) {
      return res.status(200).json({
        success: true,
        data: {
          status: "scheduled",
          pointsReached: [],
          lastUpdated: null,
        },
      });
    }

    res.status(200).json({
      success: true,
      data: tracking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a boarding/dropping point as reached
// @route   POST /api/tracking/mark-point
// @access  Private (Bus Owner only)
exports.markPointReached = async (req, res, next) => {
  try {
    const { busId, routeId, journeyDate, location, time, type } = req.body;

    // Validate required fields
    if (!busId || !routeId || !journeyDate || !location || !time || !type) {
      return next(new AppError("Please provide all required fields", 400));
    }

    // Find bus
    const bus = await Bus.findById(busId);

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    // Verify bus belongs to this owner
    if (bus.owner.toString() !== req.user.id) {
      return next(
        new AppError("You are not authorized to track this bus", 403)
      );
    }

    // Parse journey date
    const jDate = new Date(journeyDate);
    jDate.setHours(0, 0, 0, 0);

    // Find existing tracking entry
    let trackingIndex = bus.liveTracking.findIndex((t) => {
      const tDate = new Date(t.journeyDate);
      tDate.setHours(0, 0, 0, 0);

      return (
        t.routeId.toString() === routeId && tDate.getTime() === jDate.getTime()
      );
    });

    // If no tracking entry exists, create one
    if (trackingIndex === -1) {
      bus.liveTracking.push({
        routeId,
        journeyDate: jDate,
        status: "in_transit",
        pointsReached: [],
        lastUpdated: new Date(),
      });
      trackingIndex = bus.liveTracking.length - 1;
    }

    const tracking = bus.liveTracking[trackingIndex];

    // Check if point is already marked
    const alreadyMarked = tracking.pointsReached.some(
      (p) => p.location === location && p.type === type
    );

    if (alreadyMarked) {
      return next(
        new AppError(`${location} has already been marked as reached`, 400)
      );
    }

    // Add point to pointsReached
    tracking.pointsReached.push({
      location,
      time,
      type,
      markedAt: new Date(),
      markedBy: req.user.id,
    });

    tracking.lastUpdated = new Date();
    tracking.status = "in_transit";

    // Check if all points are reached to mark trip as completed
    const route = await Route.findById(routeId);
    if (route) {
      const totalPoints =
        (route.boardingPoints?.length || 0) +
        (route.droppingPoints?.length || 0);
      const reachedPoints = tracking.pointsReached.length;

      if (totalPoints > 0 && reachedPoints >= totalPoints) {
        // All points reached - mark as completed
        tracking.status = "completed";

        // Update all bookings for this trip to completed
        await Booking.updateMany(
          {
            bus: busId,
            route: routeId,
            journeyDate: {
              $gte: new Date(jDate).setHours(0, 0, 0, 0),
              $lte: new Date(jDate).setHours(23, 59, 59, 999),
            },
            bookingStatus: "confirmed",
          },
          {
            $set: { bookingStatus: "completed" },
          }
        );
      }
    }

    // Save bus
    await bus.save();

    res.status(200).json({
      success: true,
      message: `${location} marked as reached successfully${
        tracking.status === "completed" ? ". Trip completed!" : ""
      }`,
      data: tracking,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all points for a route (helper for frontend)
// @route   GET /api/tracking/route-points/:routeId
// @access  Public
exports.getRoutePoints = async (req, res, next) => {
  try {
    const { routeId } = req.params;

    const route = await Route.findById(routeId);

    if (!route) {
      return next(new AppError("Route not found", 404));
    }

    // Combine boarding and dropping points
    const points = [];

    // Add boarding points
    if (route.boardingPoints && route.boardingPoints.length > 0) {
      route.boardingPoints.forEach((point) => {
        points.push({
          location: point.location,
          time: point.time,
          type: "boarding",
        });
      });
    }

    // Add dropping points
    if (route.droppingPoints && route.droppingPoints.length > 0) {
      route.droppingPoints.forEach((point) => {
        points.push({
          location: point.location,
          time: point.time,
          type: "dropping",
        });
      });
    }

    res.status(200).json({
      success: true,
      data: {
        source: route.source,
        destination: route.destination,
        points,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBusTracking: exports.getBusTracking,
  markPointReached: exports.markPointReached,
  getRoutePoints: exports.getRoutePoints,
};
