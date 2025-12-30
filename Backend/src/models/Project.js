import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    budget: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "submitted", "completed"],
      default: "active",
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // FREELANCER WORK
    submissionUrl: {
      type: String,
    },

    progress: {
      type: Number,
      default: 0,
    },

    progressFiles: [
      {
        type: String,
      },
    ],

    // PAYMENT
    paymentReleased: {
      type: Boolean,
      default: false,
    },

    submittedAt: Date,
    approvedAt: Date,
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
