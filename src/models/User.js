import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true,//only enable the unique rule if they actually have value
  },
  plan: {
    type: String,
    enum: ["free", "pro"],
    default: "free",
  },
});

// Prevent recompilation in dev
export default mongoose.models.User || mongoose.model("User", UserSchema);
