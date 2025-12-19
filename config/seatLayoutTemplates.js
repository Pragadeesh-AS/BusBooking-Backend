/**
 * Predefined Seat Layout Templates
 * These templates define fixed seat configurations for different bus types
 */

const SEAT_LAYOUT_TEMPLATES = {
  Seater: {
    totalSeats: 40,
    layout: "2x2",
    configuration: {
      rows: 10,
      leftColumn: 10, // Single seats on left
      rightColumns: {
        rows: 10,
        columns: 3, // 3 seats on right (position as columns 2, 3, 4)
      },
    },
    generateSeats: function () {
      const seats = [];
      let seatNumber = 1;

      // Left column - 10 single window seats
      for (let row = 1; row <= this.configuration.leftColumn; row++) {
        seats.push({
          seatNumber: seatNumber.toString(),
          row: row,
          column: 1, // Left window column
          type: "seater",
          position: "window",
          deck: "lower",
        });
        seatNumber++;
      }

      // Right side - 10 rows × 3 seats (aisle, middle, window)
      for (let row = 1; row <= this.configuration.rightColumns.rows; row++) {
        for (
          let col = 1;
          col <= this.configuration.rightColumns.columns;
          col++
        ) {
          let position = "middle";
          if (col === 1) position = "aisle";
          else if (col === 3) position = "window";

          seats.push({
            seatNumber: seatNumber.toString(),
            row: row,
            column: col + 1, // Columns 2, 3, 4
            type: "seater",
            position: position,
            deck: "lower",
          });
          seatNumber++;
        }
      }

      return seats;
    },
  },

  "Semi-Sleeper": {
    totalSeats: 46,
    layout: "2x2+1x2",
    configuration: {
      lowerDeck: {
        leftColumn: 5, // 5 sleeper beds
        rightColumns: {
          rows: 12,
          columns: 2, // 12x2 = 24 seater seats
        },
      },
      upperDeck: {
        leftColumn: 5, // 5 sleeper beds
        rightColumns: {
          rows: 6,
          columns: 2, // 6x2 = 12 sleeper beds
        },
      },
    },
    generateSeats: function () {
      const seats = [];
      let seatNumber = 1;

      // ============ LOWER DECK ============
      // Left column: 5 sleeper beds
      for (let row = 1; row <= this.configuration.lowerDeck.leftColumn; row++) {
        seats.push({
          seatNumber: `L${seatNumber}`,
          row: row,
          column: 1,
          type: "sleeper",
          position: "window",
          deck: "lower",
        });
        seatNumber++;
      }

      // Right side: 8 rows × 2 columns = 16 seater seats
      for (
        let row = 1;
        row <= this.configuration.lowerDeck.rightColumns.rows;
        row++
      ) {
        for (
          let col = 1;
          col <= this.configuration.lowerDeck.rightColumns.columns;
          col++
        ) {
          seats.push({
            seatNumber: `L${seatNumber}`,
            row: row,
            column: col + 2, // Columns 3, 4
            type: "seater",
            position: col === 2 ? "window" : "aisle",
            deck: "lower",
          });
          seatNumber++;
        }
      }

      // ============ UPPER DECK ============
      // Left column: 1 sleeper bed
      for (let row = 1; row <= this.configuration.upperDeck.leftColumn; row++) {
        seats.push({
          seatNumber: `U${row}`,
          row: row,
          column: 1,
          type: "sleeper",
          position: "window",
          deck: "upper",
        });
      }

      // Right side: 3 rows × 2 columns = 6 sleeper beds
      let upperRightNum = 2;
      for (
        let row = 1;
        row <= this.configuration.upperDeck.rightColumns.rows;
        row++
      ) {
        for (
          let col = 1;
          col <= this.configuration.upperDeck.rightColumns.columns;
          col++
        ) {
          seats.push({
            seatNumber: `U${upperRightNum}`,
            row: row,
            column: col + 2, // Columns 3, 4
            type: "sleeper",
            position: col === 2 ? "window" : "aisle",
            deck: "upper",
          });
          upperRightNum++;
        }
      }

      return seats;
    },
  },

  Sleeper: {
    totalSeats: 34,
    layout: "1x2",
    configuration: {
      lowerDeck: {
        leftColumn: 5, // 5 single beds on left
        rightColumns: {
          rows: 6,
          columns: 2, // 6x2 layout = 12 beds
        },
      },
      upperDeck: {
        leftColumn: 5, // 5 single beds on left
        rightColumns: {
          rows: 6,
          columns: 2, // 6x2 layout = 12 beds
        },
      },
    },
    generateSeats: function () {
      const seats = [];
      let seatNumber = 1;

      // ============ LOWER DECK ============
      // Left column: 5 single sleeper beds (rows 1-5)
      for (let row = 1; row <= this.configuration.lowerDeck.leftColumn; row++) {
        seats.push({
          seatNumber: `L${seatNumber}`,
          row: row,
          column: 1,
          type: "sleeper",
          position: "window",
          deck: "lower",
        });
        seatNumber++;
      }

      // Reset for right side
      let rightSeatNum = 1;

      // Right side: 6 rows × 2 columns = 12 beds
      for (
        let row = 1;
        row <= this.configuration.lowerDeck.rightColumns.rows;
        row++
      ) {
        for (
          let col = 1;
          col <= this.configuration.lowerDeck.rightColumns.columns;
          col++
        ) {
          seats.push({
            seatNumber: `L${seatNumber}`,
            row: row,
            column: col + 2, // Offset by 2 to be on right side (column 3, 4)
            type: "sleeper",
            position: col === 2 ? "window" : "aisle",
            deck: "lower",
          });
          seatNumber++;
          rightSeatNum++;
        }
      }

      // ============ UPPER DECK ============
      // Left column: 5 single sleeper beds (rows 1-5)
      for (let row = 1; row <= this.configuration.upperDeck.leftColumn; row++) {
        seats.push({
          seatNumber: `U${row}`,
          row: row,
          column: 1,
          type: "sleeper",
          position: "window",
          deck: "upper",
        });
      }

      // Right side: 6 rows × 2 columns = 12 beds
      let upperRightNum = 6;
      for (
        let row = 1;
        row <= this.configuration.upperDeck.rightColumns.rows;
        row++
      ) {
        for (
          let col = 1;
          col <= this.configuration.upperDeck.rightColumns.columns;
          col++
        ) {
          upperRightNum++;
          seats.push({
            seatNumber: `U${upperRightNum}`,
            row: row,
            column: col + 2, // Offset by 2 to be on right side (column 3, 4)
            type: "sleeper",
            position: col === 2 ? "window" : "aisle",
            deck: "upper",
          });
        }
      }

      return seats;
    },
  },
};

/**
 * Get seat layout template for a specific seat type
 * @param {string} seatType - Type of seat (Seater, Semi-Sleeper, Sleeper)
 * @returns {object} Layout template with generated seats
 */
function getSeatLayoutTemplate(seatType) {
  const template = SEAT_LAYOUT_TEMPLATES[seatType];

  if (!template) {
    throw new Error(`Invalid seat type: ${seatType}`);
  }

  if (template.totalSeats === 0) {
    throw new Error(`Seat layout for ${seatType} is not yet configured`);
  }

  return {
    totalSeats: template.totalSeats,
    layout: template.layout,
    seats: template.generateSeats(),
  };
}

/**
 * Get available seat types
 * @returns {Array} Array of available seat type names
 */
function getAvailableSeatTypes() {
  return Object.keys(SEAT_LAYOUT_TEMPLATES).filter(
    (type) => SEAT_LAYOUT_TEMPLATES[type].totalSeats > 0
  );
}

module.exports = {
  SEAT_LAYOUT_TEMPLATES,
  getSeatLayoutTemplate,
  getAvailableSeatTypes,
};
