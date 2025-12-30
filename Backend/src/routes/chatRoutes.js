import express from "express";
import Message from "../models/Message.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * GET messages for a project
 */
router.get("/:projectId", protect, async (req, res) => {
  try {
    const messages = await Message.find({
      project: req.params.projectId,
    }).populate("sender", "email");

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Chat load failed" });
  }
});

/**
 * SEND message
 */
router.post("/:projectId", protect, async (req, res) => {
  try {
    const message = await Message.create({
      project: req.params.projectId,
      sender: req.user._id || req.user.id,

      message: req.body.text,
    });

    res.status(201).json(message);
  } catch (err) {
  console.error("CHAT SEND ERROR:", err);
  res.status(500).json({
    message: "Send failed",
    error: err.message,
    stack: err.stack,
  });
}

});

export default router;
