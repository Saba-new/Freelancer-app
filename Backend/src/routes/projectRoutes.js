import express from "express";
import Project from "../models/Project.js";
import User from "../models/User.js";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

/* ================= CLIENT ================= */

// CREATE PROJECT (AUTO ASSIGN FREELANCER)
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

    const project = await Project.create({
      title: req.body.title,
      budget: req.body.budget,
      client: req.user.id,
      freelancer: freelancer._id, // 🔥 KEY LINE
      status: "active",
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
    pending: projects.filter(p => p.status === "pending").length,
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

// SUBMIT WORK (LINK)
router.put("/:id/submit", protect, async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) return res.status(404).json({ message: "Not found" });

  if (project.freelancer.toString() !== req.user.id) {
    return res.status(403).json({ message: "Not authorized" });
  }

  project.submissionUrl = req.body.submissionUrl;
  project.progress = 100;
  project.status = "submitted";
  project.submittedAt = new Date();

  await project.save();
  res.json(project);
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
// Release payment (mock)
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


export default router;
