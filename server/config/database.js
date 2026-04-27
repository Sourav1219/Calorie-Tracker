const mongoose = require("mongoose");

let isConnected = false;

async function connectToDatabase() {
  if (isConnected) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string (MONGODB_URI)");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  isConnected = true;
  return mongoose.connection;
}

module.exports = { connectToDatabase };
