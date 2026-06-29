import mongoose from "mongoose";

const ThrottleLogSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    default: "N/A",
  },
  reason: {
    type: String,
    required: true,
  },
  blockedUntil: {
    type: Date,
    required: true,
  },
  city: {
    type: String,
    default: "Unknown",
  },
  country: {
    type: String,
    default: "Unknown",
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

export default mongoose.models.ThrottleLog || mongoose.model("ThrottleLog", ThrottleLogSchema);
