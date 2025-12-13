const User = require("../models/User");
const bcrypt = require("bcryptjs");

// Script to create default admin user
const createAdminUser = async () => {
  try {
    // Check if admin already exists
    const adminExists = await User.findOne({
      email: process.env.ADMIN_EMAIL || "admin@travelbooking.com",
    });

    if (adminExists) {
      console.log("Admin user already exists");
      return;
    }

    // Create admin user
    const admin = await User.create({
      name: "Admin",
      email: process.env.ADMIN_EMAIL || "admin@travelbooking.com",
      password: process.env.ADMIN_PASSWORD || "Admin@123",
      phone: "0000000000",
      role: "admin",
    });

    console.log("✅ Admin user created successfully");
    console.log("Email:", admin.email);
    console.log("Password:", process.env.ADMIN_PASSWORD || "Admin@123");
  } catch (error) {
    console.error("❌ Error creating admin user:", error.message);
  }
};

module.exports = createAdminUser;
