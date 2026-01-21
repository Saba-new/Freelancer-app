import express from "express";
import Project from "../models/Project.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import extractRequirements from "../utils/requirementExtractor.js";
import validateSubmission from "../utils/validateSubmission.js";
import { generateProgressSuggestions } from "../services/aiService.js";

const router = express.Router();

/* ================= CLIENT ================= */

// CREATE PROJECT (AUTO ASSIGN FREELANCER + AI REQUIREMENTS)
router.post("/", protect, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Only client allowed" });
    }

    // Auto-pick first freelancer
    const freelancer = await User.findOne({ role: "freelancer" });
    if (!freelancer) {
      return res.status(400).json({ message: "No freelancer available" });
    }

    // 🔥 AI-assisted requirement extraction (now async)
    const requirements = await extractRequirements(req.body.description || "");

    const project = await Project.create({
      title: req.body.title,
      budget: req.body.budget,
      description: req.body.description,
      client: req.user.id,
      freelancer: freelancer._id,
      status: "active",
      requirements,
    });

    res.status(201).json(project);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// CLIENT DASHBOARD
router.get("/client-dashboard", protect, async (req, res) => {
  const projects = await Project.find({ client: req.user.id });

  res.json({
    active: projects.filter(p => p.status === "active").length,
    completed: projects.filter(p => p.status === "completed").length,
    submitted: projects.filter(p => p.status === "submitted").length,
    totalBudget: projects.reduce((s, p) => s + p.budget, 0),
    projects,
  });
});

// APPROVE & RELEASE PAYMENT
router.put("/:id/approve", protect, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Not found" });

  if (project.client.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  project.status = "completed";
  project.paymentReleased = true;
  project.approvedAt = new Date();

  await project.save();
  res.json(project);
});

// DELETE PROJECT
router.delete("/:id", protect, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Not found" });

  if (project.client.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  await project.deleteOne();
  res.json({ message: "Deleted" });
});

/* ================= FREELANCER ================= */

// FREELANCER DASHBOARD
router.get("/freelancer-dashboard", protect, async (req, res) => {
  if (req.user.role !== "freelancer") {
    return res.status(403).json({ message: "Access denied" });
  }

  const projects = await Project.find({ freelancer: req.user.id });
  res.json({ projects });
});

// UPDATE REQUIREMENT STATUS (TRACKING)
router.patch(
  "/:projectId/requirements/:requirementId",
  protect,
  async (req, res) => {
    try {
      const { status } = req.body;
      const project = await Project.findById(req.params.projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const requirement = project.requirements.id(req.params.requirementId);
      if (!requirement) {
        return res.status(404).json({ message: "Requirement not found" });
      }

      requirement.status = status;
      await project.save();

      res.json(project);
    } catch (err) {
      res.status(500).json({ message: "Failed to update requirement" });
    }
  }
);

// SUBMIT WORK (LINK + AI VALIDATION)
router.put("/:id/submit", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Not found" });

    if (project.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // 🔥 AI-assisted validation (now async with detailed report)
    const validation = await validateSubmission(
      project.requirements,
      req.body.submissionDescription || req.body.submissionUrl || "",
      req.body.submissionUrl || ""
    );

    project.submissionUrl = req.body.submissionUrl;
    project.validationReport = validation.validationReport || [];
    project.overallScore = validation.overallScore || 0;
    project.aiFeedback = validation.feedback || "";
    project.aiMissingItems = validation.missingItems || [];
    project.aiStrengths = validation.strengths || [];
    project.progress = validation.overallScore || 100;
    project.status = "submitted";
    project.submittedAt = new Date();

    await project.save();
    res.json({ 
      project,
      validation: {
        overallScore: validation.overallScore,
        feedback: validation.feedback,
        missingItems: validation.missingItems,
        strengths: validation.strengths,
      }
    });
  } catch (err) {
    console.error("Submit error:", err);
    res.status(500).json({ message: "Submission failed" });
  }
});

// UPLOAD FILES
router.put(
  "/:id/upload",
  protect,
  upload.array("files", 5),
  async (req, res) => {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Not found" });

    if (project.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const fileUrls = req.files.map(file => file.path);
    project.progressFiles.push(...fileUrls);
    project.progress = 100;
    project.status = "submitted";

    await project.save();
    res.json(project);
  }
);

// RELEASE PAYMENT (MOCK)
router.put("/:id/release-payment", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.paymentReleased = true;
    project.status = "completed";
    await project.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: "Payment release failed" });
  }
});

// GET AI PROGRESS SUGGESTIONS
router.get("/:id/progress-suggestions", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Only freelancer assigned to project can get suggestions
    if (project.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const suggestions = await generateProgressSuggestions(project);
    res.json(suggestions);
  } catch (err) {
    console.error("Progress suggestion error:", err);
    res.status(500).json({ message: "Failed to generate suggestions" });
  }
});

// GET SINGLE PROJECT DETAILS
router.get("/:id", protect, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate("client", "email")
      .populate("freelancer", "email");

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Check authorization
    const isClient = project.client._id.toString() === req.user.id;
    const isFreelancer = project.freelancer._id.toString() === req.user.id;

    if (!isClient && !isFreelancer) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(project);
  } catch (err) {
    console.error("Get project error:", err);
    res.status(500).json({ message: "Failed to fetch project" });
  }
});

export default router;
