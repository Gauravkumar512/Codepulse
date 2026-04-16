import mongoose from "mongoose";

let isConnected = false;

export async function connect() {
  if (isConnected) return;

  const MONGO_DB_URL = process.env.DB_CONFIG;

  if (!MONGO_DB_URL) {
    throw new Error("Please define the DB_CONFIG environment variable");
  }

  try {
    await mongoose.connect(MONGO_DB_URL);
    isConnected = true;
    console.log("DB connected");

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
      isConnected = false;
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected");
      isConnected = false;
    });
  } catch (error) {
    console.error("Something went wrong connecting to MongoDB:", error);
    throw error;
  }
}