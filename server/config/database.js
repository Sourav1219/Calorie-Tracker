const mongoose = require("mongoose");

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error("❌ MONGODB_URI is not defined in environment variables");
    throw new Error("Missing MongoDB connection string (MONGODB_URI)");
  }

  try {
    console.log("⏳ Connecting to MongoDB...");
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000, // Increase timeout for cloud cold-starts
      socketTimeoutMS: 45000,         // Close sockets after 45 seconds of inactivity
    });

    isConnected = true;
    console.log("✅ MongoDB Connection Established");
    return mongoose.connection;
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    throw error;
  }
}

module.exports = { connectToDatabase };
