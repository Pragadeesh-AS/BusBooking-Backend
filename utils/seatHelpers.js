/**
 * Seat Adjacency Helper Functions
 * Determines which seats are adjacent based on bus layout type
 */

/**
 * Get adjacent seat numbers based on bus type and layout
 * @param {string} seatNumber - The seat number (e.g., "1", "13", "1A", "2L", "UB12")
 * @param {string} busType - The type of bus (Seater, Sleeper, Semi-Sleeper)
 * @returns {Array} Array of adjacent seat numbers
 */
function getAdjacentSeats(seatNumber, busType) {
  const adjacent = [];

  // Validate input
  if (!seatNumber || typeof seatNumber !== "string") {
    return adjacent;
  }

  console.log("🔍 getAdjacentSeats called:");
  console.log("  - seatNumber:", seatNumber);
  console.log("  - busType:", busType);

  // Handle different bus types
  if (busType === "Seater") {
    // Seater: 40 seats in 2x2 layout
    // Layout: [1][2] | [3][4] in row 1, [5][6] | [7][8] in row 2, etc.
    // Adjacent pairs: (1,2), (3,4), (5,6), (7,8), (9,10), etc.
    // Pattern: odd seats pair with next (odd+1), even seats pair with prev (even-1)

    const seatNum = parseInt(seatNumber);

    if (seatNum % 2 === 1) {
      // Odd seat - pairs with next seat
      adjacent.push(String(seatNum + 1));
    } else {
      // Even seat - pairs with previous seat
      adjacent.push(String(seatNum - 1));
    }

    console.log(
      "  ✅ Seater 2x2 layout, seat:",
      seatNum,
      "adjacent:",
      adjacent
    );
  } else if (busType === "Sleeper") {
    // Sleeper: L1-L17 (lower), U1-U18 (upper)
    // Adjacent: same level consecutive + opposite level same number
    const levelMatch = seatNumber.match(/^([LU])(\d+)$/);

    if (!levelMatch) {
      console.log("  ❌ Invalid Sleeper format");
      return [];
    }

    const level = levelMatch[1]; // 'L' or 'U'
    const num = parseInt(levelMatch[2]);
    const maxNum = level === "L" ? 17 : 18;

    console.log("  ✅ Sleeper detected - level:", level, "num:", num);

    // Seats 1-5 are isolated single beds (no adjacent seats)
    if (num >= 1 && num <= 5) {
      console.log("  ✅ Single bed (isolated), no adjacent");
      return [];
    }

    // For seats 6-17, they pair as: (6,7), (8,9), (10,11), (12,13), (14,15), (16,17)
    if (num >= 6 && num <= 17) {
      if (num % 2 === 0) {
        // Even number (6, 8, 10, 12, 14, 16) - pairs with next (odd)
        adjacent.push(`${level}${num + 1}`);
      } else {
        // Odd number (7, 9, 11, 13, 15, 17) - pairs with previous (even)
        adjacent.push(`${level}${num - 1}`);
      }
    }

    console.log("  ✅ Sleeper adjacent:", adjacent);
  } else if (busType === "Semi-Sleeper") {
    // Semi-Sleeper: Lower (L1-L29), Upper (U1-U17)
    // Lower: L1-L5 sleeper + L6-L29 seater (24 seats)
    // Upper: U1-U5 sleeper + U6-U17 sleeper (12 berths)

    if (seatNumber.startsWith("L")) {
      const num = parseInt(seatNumber.substring(1));

      if (num >= 1 && num <= 5) {
        // Lower sleeper column - single beds, no adjacent
        console.log("  ✅ Semi-Sleeper lower sleeper column (no adjacent)");
        return [];
      } else if (num >= 6 && num <= 29) {
        // Lower seater section - pairs (L6-L7, L8-L9, ...)
        if (num % 2 === 0) {
          adjacent.push(`L${num + 1}`);
        } else {
          adjacent.push(`L${num - 1}`);
        }
        console.log("  ✅ Semi-Sleeper lower seater adjacent:", adjacent);
      }
    } else if (seatNumber.startsWith("U")) {
      const num = parseInt(seatNumber.substring(1));

      if (num >= 1 && num <= 5) {
        // Upper sleeper column - single beds, no adjacent
        console.log("  ✅ Semi-Sleeper upper sleeper column (no adjacent)");
        return [];
      } else if (num >= 6 && num <= 17) {
        // Upper sleeper section - pairs (U6-U7, U8-U9, ...)
        if (num % 2 === 0) {
          adjacent.push(`U${num + 1}`);
        } else {
          adjacent.push(`U${num - 1}`);
        }
        console.log("  ✅ Semi-Sleeper upper sleeper adjacent:", adjacent);
      }
    }
  }

  console.log("  🔍 Final adjacent seats:", adjacent);
  return adjacent.filter((seat) => seat); // Remove any undefined values
}

/**
 * Check if a seat has any adjacent seats
 * @param {string} seatNumber - The seat number
 * @param {string} busType - The type of bus
 * @returns {boolean} True if seat has adjacent seats
 */
function hasAdjacentSeats(seatNumber, busType) {
  const adjacent = getAdjacentSeats(seatNumber, busType);
  return adjacent.length > 0;
}

/**
 * Apply gender restrictions to available seats based on booked seats
 * @param {Array} availableSeats - Array of available seat objects
 * @param {Array} bookedSeats - Array of booked seat objects from database
 * @param {string} busType - The type of bus
 * @returns {Array} Available seats with gender restriction info added
 */
function applyGenderRestrictions(availableSeats, bookedSeats, busType) {
  // Create a map of available seats for quick lookup
  const seatMap = {};
  availableSeats.forEach((seat) => {
    seatMap[seat.seatNumber] = seat;
  });

  // Process each booked seat that has gender preference enabled
  bookedSeats.forEach((booking) => {
    booking.seats.forEach((bookedSeat) => {
      if (bookedSeat.genderPreference) {
        // Get adjacent seats for this booked seat
        const adjacentSeats = getAdjacentSeats(bookedSeat.seatNumber, busType);

        // Mark each adjacent seat with gender restriction
        adjacentSeats.forEach((adjSeatNumber) => {
          if (seatMap[adjSeatNumber]) {
            // This seat is available and adjacent to a restricted seat
            if (!seatMap[adjSeatNumber].genderRestriction) {
              seatMap[adjSeatNumber].genderRestriction =
                bookedSeat.passengerGender;
              seatMap[adjSeatNumber].restrictedBy = bookedSeat.seatNumber;
            } else if (
              seatMap[adjSeatNumber].genderRestriction !==
              bookedSeat.passengerGender
            ) {
              // Multiple different gender restrictions - mark as highly restricted
              seatMap[adjSeatNumber].genderRestriction = "Multiple";
            }
          }
        });
      }
    });
  });

  return Object.values(seatMap);
}

module.exports = {
  getAdjacentSeats,
  hasAdjacentSeats,
  applyGenderRestrictions,
};
