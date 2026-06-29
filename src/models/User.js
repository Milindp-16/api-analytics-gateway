import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true,
    maxlength: [100, "Name cannot exceed 100 characters"],
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true,
  },
  plan: {
    type: String,
    enum: ["free", "pro"],
    default: "free",
  },
});

// Prevent recompilation in dev
export default mongoose.models.User || mongoose.model("User", UserSchema);
