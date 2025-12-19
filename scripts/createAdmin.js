const mongoose = require("mongoose");
const User = require("../models/User");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: "admin@travel.com" });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists with email: admin@travel.com");
      console.log("Email:", existingAdmin.email);
      console.log("Role:", existingAdmin.role);
      process.exit(0);
    }

    // Create admin user
    const admin = await User.create({
      name: "Admin User",
      email: "admin@travel.com",
      password: "admin123", // Will be hashed by the User model
      phone: "1234567890",
      role: "admin",
    });

    console.log("✅ Admin user created successfully!\n");
    console.log("📧 Email: admin@travel.com");
    console.log("🔑 Password: admin123");
    console.log("👤 Role: admin\n");
    console.log("You can now login at: http://localhost:3000/admin/login\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    process.exit(1);
  }
};

createAdmin();
