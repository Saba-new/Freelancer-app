import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ["client", "freelancer"],
      default: "client",
    },

    // EMAIL VERIFICATION (optional – not enforced yet)
    isVerified: {
      type: Boolean,
      default: true, // 🔥 IMPORTANT FIX
    },
    emailOTP: String,
    otpExpiresAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
