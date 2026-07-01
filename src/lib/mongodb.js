import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable in .env.local");
}

async function connectDB() {
  // If we are already connected, don't connect again!
  if (mongoose.connection.readyState >= 1) {
    return;
  }

  try {
    // Attempt to connect to the database
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Successfully connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
}

export default connectDB;
