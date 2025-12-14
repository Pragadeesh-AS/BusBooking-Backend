const bcrypt = require("bcryptjs");

// Hash the password
const hashPassword = async () => {
  const password = "Admin@123"; // Change this to your desired password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  console.log("\n=================================");
  console.log("Admin User Details:");
  console.log("=================================");
  console.log("Email: admin@travelbooking.com");
  console.log("Password:", password);
  console.log("Hashed Password:", hashedPassword);
  console.log("=================================\n");
  console.log("Copy the hashed password above and use it in MongoDB Compass");
};

hashPassword();
