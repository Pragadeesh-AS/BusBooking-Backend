const mongoose = require("mongoose");
require("dotenv").config();

const resetDatabase = async () => {
  try {
    console.log("⚠️  WARNING: Deleting ALL data from database...\n");

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all collection names
    const collections = Object.keys(mongoose.connection.collections);

    console.log(`🗑️  Deleting ${collections.length} collections:\n`);

    // Delete all documents in each collection
    for (const collectionName of collections) {
      const collection = mongoose.connection.collections[collectionName];
      const result = await collection.deleteMany({});
      console.log(
        `✅ ${collectionName}: Deleted ${result.deletedCount} documents`
      );
    }

    console.log("\n✅ ALL DATA DELETED SUCCESSFULLY!");
    console.log("📊 Database is now empty.\n");

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

resetDatabase();
