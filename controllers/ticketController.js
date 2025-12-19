const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const Booking = require("../models/Booking");
const { AppError } = require("../middleware/errorHandler");

// @desc    Generate PDF ticket
// @route   GET /api/bookings/:id/ticket
// @access  Private
exports.generateTicket = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("user", "name email phone")
      .populate("bus")
      .populate("route");

    if (!booking) {
      return next(new AppError("Booking not found", 404));
    }

    // Check authorization
    if (
      req.user.role !== "admin" &&
      booking.user._id.toString() !== req.user._id.toString()
    ) {
      return next(new AppError("Not authorized", 403));
    }

    // Create PDF document
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    // Set response headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=ticket-${booking.bookingId}.pdf`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // Generate QR code
    const qrCodeData = `BOOKING:${booking.bookingId}|USER:${booking.user.email}|DATE:${booking.journeyDate}`;
    const qrCodeImage = await QRCode.toDataURL(qrCodeData);

    // Header with branding
    doc.fontSize(24).fillColor("#d84e55").text("TRAVEL BOOKING", 50, 50);

    doc
      .fontSize(12)
      .fillColor("#666")
      .text("Your Journey, Our Commitment", 50, 80);

    // Draw line
    doc
      .strokeColor("#d84e55")
      .lineWidth(2)
      .moveTo(50, 100)
      .lineTo(550, 100)
      .stroke();

    // Booking ID and Status
    doc
      .fontSize(14)
      .fillColor("#333")
      .text(`Booking ID: ${booking.bookingId}`, 50, 120, { bold: true });

    doc
      .fontSize(10)
      .fillColor("#28a745")
      .text(`Status: ${booking.bookingStatus.toUpperCase()}`, 50, 140);

    // QR Code (right side)
    const qrImage = qrCodeImage.split(",")[1];
    const qrBuffer = Buffer.from(qrImage, "base64");
    doc.image(qrBuffer, 450, 120, { width: 100, height: 100 });

    // Journey Details
    doc.fontSize(16).fillColor("#d84e55").text("Journey Details", 50, 180);

    doc
      .fontSize(12)
      .fillColor("#333")
      .text(`From: ${booking.route.source}`, 50, 210)
      .text(`To: ${booking.route.destination}`, 50, 230)
      .text(
        `Date: ${new Date(booking.journeyDate).toLocaleDateString("en-IN", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        50,
        250
      )
      .text(`Departure: ${booking.route.departureTime}`, 50, 270)
      .text(`Arrival: ${booking.route.arrivalTime}`, 50, 290)
      .text(`Duration: ${booking.route.duration}`, 50, 310);

    // Bus Details
    doc.fontSize(16).fillColor("#d84e55").text("Bus Details", 50, 350);

    doc
      .fontSize(12)
      .fillColor("#333")
      .text(`Bus: ${booking.bus.name}`, 50, 380)
      .text(`Number: ${booking.bus.busNumber}`, 50, 400)
      .text(`Type: ${booking.bus.busType}`, 50, 420);

    // Passenger Details
    doc.fontSize(16).fillColor("#d84e55").text("Passenger Details", 50, 460);

    let y = 490;
    booking.seats.forEach((seat, index) => {
      doc
        .fontSize(12)
        .fillColor("#333")
        .text(
          `${index + 1}. ${seat.passengerName} (${seat.passengerGender}, ${
            seat.passengerAge
          } yrs) - Seat ${seat.seatNumber}`,
          50,
          y
        );
      y += 20;
    });

    // Boarding/Dropping Points
    if (booking.boardingPoint || booking.droppingPoint) {
      y += 10;
      doc.fontSize(16).fillColor("#d84e55").text("Pickup & Drop", 50, y);

      y += 30;
      if (booking.boardingPoint) {
        doc
          .fontSize(12)
          .fillColor("#333")
          .text(`Boarding: ${booking.boardingPoint.location}`, 50, y)
          .text(`Time: ${booking.boardingPoint.time}`, 70, y + 15);
        y += 40;
      }

      if (booking.droppingPoint) {
        doc
          .fontSize(12)
          .fillColor("#333")
          .text(`Dropping: ${booking.droppingPoint.location}`, 50, y)
          .text(`Time: ${booking.droppingPoint.time}`, 70, y + 15);
        y += 40;
      }
    }

    // Fare Details
    y += 10;
    doc.fontSize(16).fillColor("#d84e55").text("Fare Details", 50, y);

    y += 30;
    doc
      .fontSize(12)
      .fillColor("#333")
      .text(
        `Base Fare: ₹${booking.route.price} x ${booking.seats.length}`,
        50,
        y
      )
      .text(`Total Amount: ₹${booking.totalAmount}`, 50, y + 20)
      .text(`Payment Status: ${booking.paymentStatus}`, 50, y + 40);

    // Footer
    doc
      .fontSize(10)
      .fillColor("#666")
      .text("Terms & Conditions:", 50, doc.page.height - 100)
      .fontSize(8)
      .text(
        "1. Please carry a valid ID proof during journey",
        50,
        doc.page.height - 80
      )
      .text(
        "2. Report at boarding point 15 minutes before departure",
        50,
        doc.page.height - 70
      )
      .text(
        "3. Cancellation charges as per company policy",
        50,
        doc.page.height - 60
      );

    doc
      .fontSize(8)
      .fillColor("#999")
      .text(
        `Generated on: ${new Date().toLocaleString("en-IN")}`,
        50,
        doc.page.height - 30
      );

    // Finalize PDF
    doc.end();
  } catch (error) {
    next(error);
  }
};
