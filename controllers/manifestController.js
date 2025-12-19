const XLSX = require("xlsx");
const Booking = require("../models/Booking");
const { AppError } = require("../middleware/errorHandler");

// @desc    Get passenger manifest for a route/date
// @route   GET /api/busowner/manifest?routeId=xxx&date=xxx
// @access  Private/BusOwner
exports.getPassengerManifest = async (req, res, next) => {
  try {
    const { routeId, date } = req.query;

    if (!routeId || !date) {
      return next(new AppError("Please provide route ID and date", 400));
    }

    // Fetch all confirmed bookings for this route and date
    const bookings = await Booking.find({
      route: routeId,
      journeyDate: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      },
      bookingStatus: "confirmed",
    })
      .populate("user", "name email phone")
      .populate("route", "source destination departureTime arrivalTime")
      .populate("bus", "busNumber name")
      .sort("createdAt");

    if (bookings.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No bookings found for this route and date",
        data: [],
      });
    }

    // Verify ownership - check if any bus in these bookings belongs to the logged-in owner
    const firstBus = bookings[0].bus;
    const Bus = require("../models/Bus");
    const bus = await Bus.findById(firstBus._id);

    if (bus.owner.toString() !== req.user._id.toString()) {
      return next(new AppError("Not authorized to view this manifest", 403));
    }

    // Prepare passenger data for Excel
    const passengerData = [];

    bookings.forEach((booking) => {
      booking.seats.forEach((seat) => {
        passengerData.push({
          "Booking ID": booking.bookingId,
          "Passenger Name": seat.passengerName,
          Age: seat.passengerAge,
          Gender: seat.passengerGender,
          "Seat Number": seat.seatNumber,
          "Contact Name": booking.user.name,
          Email: booking.user.email,
          Phone: booking.user.phone,
          "Boarding Point": booking.boardingPoint?.location || "N/A",
          "Dropping Point": booking.droppingPoint?.location || "N/A",
          Fare: `₹${booking.totalAmount / booking.seats.length}`,
          "Payment Status": booking.paymentStatus,
          "Booked At": new Date(booking.createdAt).toLocaleString("en-IN"),
        });
      });
    });

    // Create Excel workbook
    const ws = XLSX.utils.json_to_sheet(passengerData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Passenger List");

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Booking ID
      { wch: 25 }, // Passenger Name
      { wch: 5 }, // Age
      { wch: 10 }, // Gender
      { wch: 12 }, // Seat Number
      { wch: 20 }, // Contact Name
      { wch: 30 }, // Email
      { wch: 15 }, // Phone
      { wch: 25 }, // Boarding Point
      { wch: 25 }, // Dropping Point
      { wch: 10 }, // Fare
      { wch: 15 }, // Payment Status
      { wch: 20 }, // Booked At
    ];

    // Generate Excel buffer
    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Set response headers for file download
    const route = bookings[0].route;
    const fileName = `Passenger_List_${route.source}_${route.destination}_${date}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};

// @desc    Get manifest summary (without download)
// @route   GET /api/busowner/manifest/summary?routeId=xxx&date=xxx
// @access  Private/BusOwner
exports.getManifestSummary = async (req, res, next) => {
  try {
    const { routeId, date } = req.query;

    if (!routeId || !date) {
      return next(new AppError("Please provide route ID and date", 400));
    }

    const bookings = await Booking.find({
      route: routeId,
      journeyDate: {
        $gte: new Date(date).setHours(0, 0, 0, 0),
        $lte: new Date(date).setHours(23, 59, 59, 999),
      },
      bookingStatus: "confirmed",
    }).populate("bus route");

    const totalPassengers = bookings.reduce(
      (sum, booking) => sum + booking.seats.length,
      0
    );
    const totalRevenue = bookings.reduce(
      (sum, booking) => sum + booking.totalAmount,
      0
    );

    res.status(200).json({
      success: true,
      data: {
        totalBookings: bookings.length,
        totalPassengers,
        totalRevenue,
        route: bookings[0]?.route || null,
      },
    });
  } catch (error) {
    next(error);
  }
};
