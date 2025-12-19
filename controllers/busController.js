const Bus = require("../models/Bus");
const Route = require("../models/Route");
const Booking = require("../models/Booking");
const SeatLayout = require("../models/SeatLayout");
const { AppError } = require("../middleware/errorHandler");
const {
  applyGenderRestrictions,
  getAdjacentSeats,
  hasAdjacentSeats,
} = require("../utils/seatHelpers");

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
    let query = {
      source: new RegExp(source, "i"),
      destination: new RegExp(destination, "i"),
      isActive: true,
    };

    let routes = await Route.find(query).populate("bus");

    // Filter by bus operating days
    const travelDate = new Date(date);
    const dayName = travelDate.toLocaleString("en-US", { weekday: "long" });

    let availableRoutes = routes.filter((route) => {
      // Check if bus operates on the selected day
      if (!route.bus.days || route.bus.days.length === 0) return true;
      return route.bus.days.includes(dayName);
    });

    // Apply advanced filters
    const { busType, operator, amenities, timeSlot } = req.query;

    // Filter by bus type
    if (busType) {
      const types = Array.isArray(busType) ? busType : [busType];
      availableRoutes = availableRoutes.filter((route) =>
        types.includes(route.bus.busType)
      );
    }

    // Filter by operator
    if (operator) {
      availableRoutes = availableRoutes.filter((route) =>
        route.bus.operator.toLowerCase().includes(operator.toLowerCase())
      );
    }

    // Filter by amenities
    if (amenities) {
      const requiredAmenities = Array.isArray(amenities)
        ? amenities
        : [amenities];
      availableRoutes = availableRoutes.filter((route) =>
        requiredAmenities.every((amenity) =>
          route.bus.amenities?.includes(amenity)
        )
      );
    }

    // Filter by time slot
    if (timeSlot) {
      availableRoutes = availableRoutes.filter((route) => {
        const hour = parseInt(route.departureTime.split(":")[0]);
        switch (timeSlot) {
          case "morning":
            return hour >= 6 && hour < 12;
          case "afternoon":
            return hour >= 12 && hour < 17;
          case "evening":
            return hour >= 17 && hour < 21;
          case "night":
            return hour >= 21 || hour < 6;
          default:
            return true;
        }
      });
    }

    // For each route, get available seats count
    const routesWithSeats = await Promise.all(
      availableRoutes.map(async (route) => {
        // Get booked seats for this route and date
        const bookings = await Booking.find({
          bus: route.bus._id,
          route: route._id,
          journeyDate: {
            $gte: new Date(date).setHours(0, 0, 0, 0),
            $lte: new Date(date).setHours(23, 59, 59, 999),
          },
          bookingStatus: "confirmed",
        });

        const bookedSeatsCount = bookings.reduce(
          (total, booking) => total + booking.seats.length,
          0
        );

        const availableSeats = route.bus.totalSeats - bookedSeatsCount;

        return {
          ...route.toObject(),
          availableSeats,
          bookedSeats: bookedSeatsCount,
        };
      })
    );

    // Sort if requested
    const { sortBy, sortOrder } = req.query;
    if (sortBy) {
      routesWithSeats.sort((a, b) => {
        const order = sortOrder === "desc" ? -1 : 1;

        switch (sortBy) {
          case "price":
            return (a.price - b.price) * order;
          case "departureTime":
            return a.departureTime.localeCompare(b.departureTime) * order;
          case "rating":
            return ((a.bus.rating || 0) - (b.bus.rating || 0)) * order;
          default:
            return 0;
        }
      });
    }

    res.status(200).json({
      success: true,
      count: routesWithSeats.length,
      data: routesWithSeats,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured buses for home page
// @route   GET /api/buses
// @access  Public
exports.getFeaturedBuses = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 6;

    const buses = await Bus.find({ isActive: true })
      .sort({ rating: -1, createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      count: buses.length,
      data: buses,
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

// @desc    Get seat layout and availability with gender restrictions
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

    // Get bus type for adjacency calculations
    const busType = seatLayout.bus.seatType || seatLayout.bus.busType;

    // Get all bookings for this route and date
    const journeyDate = new Date(date);
    const bookings = await Booking.find({
      bus: busId,
      route: routeId,
      journeyDate: {
        $gte: new Date(journeyDate.setHours(0, 0, 0, 0)),
        $lte: new Date(journeyDate.setHours(23, 59, 59, 999)),
      },
      bookingStatus: { $ne: "cancelled" },
    });

    // Create a map of booked seats with gender info
    const bookedSeatsMap = {};
    bookings.forEach((booking) => {
      booking.seats.forEach((seat) => {
        bookedSeatsMap[seat.seatNumber] = {
          passengerGender: seat.passengerGender,
          passengerName: seat.passengerName,
          genderPreference: seat.genderPreference || false,
        };
      });
    });

    // Mark seats with availability and gender restrictions
    const seatsWithAvailability = seatLayout.seats.map((seat) => {
      const isBooked = bookedSeatsMap[seat.seatNumber];

      // Check if this seat has adjacent seats
      const hasAdjacent = hasAdjacentSeats(seat.seatNumber, busType);

      // Get adjacent seat numbers
      const adjacentSeatNumbers = getAdjacentSeats(seat.seatNumber, busType);

      // Collect info about adjacent booked seats
      const adjacentBookedSeats = adjacentSeatNumbers
        .filter((adjSeatNum) => bookedSeatsMap[adjSeatNum])
        .map((adjSeatNum) => ({
          seatNumber: adjSeatNum,
          gender: bookedSeatsMap[adjSeatNum].passengerGender,
          hasGenderPreference: bookedSeatsMap[adjSeatNum].genderPreference,
        }));

      let genderRestriction = null;

      if (!isBooked && adjacentBookedSeats.length > 0) {
        // Check for hard restrictions (gender preference enabled)
        const hardRestriction = adjacentBookedSeats.find(
          (adj) => adj.hasGenderPreference
        );

        if (hardRestriction) {
          genderRestriction = hardRestriction.gender;
        }
      }

      return {
        ...seat.toObject(),
        isBooked: !!isBooked,
        bookedByGender: isBooked ? isBooked.passengerGender : null,
        genderRestriction: genderRestriction || "Any", // "Male", "Female", or "Any"
        hasAdjacent, // NEW: Flag for conditional UI
        adjacentBookedSeats, // NEW: Info about adjacent booked seats for warnings
      };
    });

    res.status(200).json({
      success: true,
      data: {
        layout: seatLayout.layout,
        totalSeats: seatLayout.totalSeats,
        seats: seatsWithAvailability,
        busType, // NEW: Include bus type for frontend logic
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get featured buses for home page
// @route   GET /api/buses
// @access  Public
exports.getFeaturedBuses = async (req, res, next) => {
  try {
    const buses = await Bus.find().select('name busNumber busType operator totalSeats seatType amenities rating reviewCount').limit(20);
    res.status(200).json({
      success: true,
      data: buses,
    });
  } catch (error) {
    next(error);
  }
};
