import mongoose from "mongoose";

const GeoHitSchema = new mongoose.Schema({
  ip: {
    type: String,
    required: true,
    index: true,
  },
  endpoint: {
    type: String,
    required: true,
    index: true,
  },
  lat: {
    type: Number,
    required: true,
  },
  lng: {
    type: Number,
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

export default mongoose.models.GeoHit || mongoose.model("GeoHit", GeoHitSchema);
