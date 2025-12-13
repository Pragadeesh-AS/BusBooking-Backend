const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Booking = require("../models/Booking");
const SeatLayout = require("../models/SeatLayout");
const { AppError } = require("../middleware/errorHandler");

// @desc    Search buses
// @route   GET /api/buses/search
// @access  Public
exports.searchBuses = async (req, res, next) => {
  try {
    const { source, destination, date } = req.query;

    if (!source || !destination || !date) {
      return next(
        new AppError("Please provide source, destination, and date", 400)
      );
    }

    // Find routes matching criteria
    const routes = await Route.find({
      source: new RegExp(source, "i"),
      destination: new RegExp(destination, "i"),
      isActive: true,
    }).populate("bus");

    // Filter routes based on the day of week
    const journeyDate = new Date(date);
    const dayName = journeyDate.toLocaleDateString("en-US", {
      weekday: "long",
    });

    const availableRoutes = routes.filter((route) => {
      if (route.days && route.days.length > 0) {
        return route.days.includes(dayName);
      }
      return true; // If no specific days, available all days
    });

    // Get seat availability for each route
    const routesWithAvailability = await Promise.all(
      availableRoutes.map(async (route) => {
        const bookedSeats = await Booking.find({
          route: route._id,
          journeyDate: {
            $gte: new Date(date).setHours(0, 0, 0, 0),
            $lte: new Date(date).setHours(23, 59, 59, 999),
          },
          bookingStatus: "confirmed",
        });

        const totalBookedSeats = bookedSeats.reduce((acc, booking) => {
          return acc + booking.seats.length;
        }, 0);

        const availableSeats = route.bus.totalSeats - totalBookedSeats;

        return {
          _id: route._id,
          bus: route.bus,
          source: route.source,
          destination: route.destination,
          departureTime: route.departureTime,
          arrivalTime: route.arrivalTime,
          duration: route.duration,
          distance: route.distance,
          price: route.price,
          availableSeats,
          totalSeats: route.bus.totalSeats,
          boardingPoints: route.boardingPoints,
          droppingPoints: route.droppingPoints,
        };
      })
    );

    // Filter out routes with no available seats
    const routesWithSeats = routesWithAvailability.filter(
      (r) => r.availableSeats > 0
    );

    res.status(200).json({
      success: true,
      count: routesWithSeats.length,
      data: routesWithSeats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get bus details
// @route   GET /api/buses/:id
// @access  Public
exports.getBusDetails = async (req, res, next) => {
  try {
    const bus = await Bus.findById(req.params.id);

    if (!bus) {
      return next(new AppError("Bus not found", 404));
    }

    // Get associated routes
    const routes = await Route.find({ bus: bus._id, isActive: true });

    res.status(200).json({
      success: true,
      data: {
        bus,
        routes,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get seat layout and availability
// @route   GET /api/buses/:busId/seats
// @access  Public
exports.getSeatLayout = async (req, res, next) => {
  try {
    const { busId } = req.params;
    const { routeId, date } = req.query;

    if (!routeId || !date) {
      return next(new AppError("Please provide routeId and date", 400));
    }

    // Get seat layout
    const seatLayout = await SeatLayout.findOne({ bus: busId }).populate("bus");

    if (!seatLayout) {
      return next(new AppError("Seat layout not found for this bus", 404));
    }

    // Get booked seats for this route and date
    const bookings = await Booking.find({
      bus: busId,
      route: routeId,
      journeyDate: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      },
      bookingStatus: "confirmed",
    });

    // Get all booked seat numbers
    const bookedSeatNumbers = [];
    bookings.forEach((booking) => {
      booking.seats.forEach((seat) => {
        bookedSeatNumbers.push(seat.seatNumber);
      });
    });

    // Mark seats as booked or available
    const seatsWithAvailability = seatLayout.seats.map((seat) => ({
      ...seat.toObject(),
      isBooked: bookedSeatNumbers.includes(seat.seatNumber),
    }));

    res.status(200).json({
      success: true,
      data: {
        layout: seatLayout.layout,
        totalSeats: seatLayout.totalSeats,
        seats: seatsWithAvailability,
      },
    });
  } catch (error) {
    next(error);
  }
};
