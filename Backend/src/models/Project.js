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

    // ✅ NEW: REQUIREMENT TRACKING (AI + VALIDATION BASE)
    requirements: [
      {
        text: {
          type: String,
          required: true,
        },
        category: {
          type: String,
          enum: ["frontend", "backend", "database", "authentication", "api", "deployment", "testing", "other"],
          default: "other",
        },
        priority: {
          type: String,
          enum: ["high", "medium", "low"],
          default: "medium",
        },
        status: {
          type: String,
          enum: ["pending", "in-progress", "completed"],
          default: "pending",
        },
        verified: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // PROJECT DESCRIPTION
    description: {
      type: String,
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
    validationReport: [
      {
        requirement: String,
        matched: Boolean,
        confidence: Number,
        evidence: String,
      },
    ],
    
    // AI VALIDATION FEEDBACK
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    aiFeedback: String,
    aiMissingItems: [String],
    aiStrengths: [String],
  },
  { timestamps: true }
);

export default mongoose.model("Project", projectSchema);
