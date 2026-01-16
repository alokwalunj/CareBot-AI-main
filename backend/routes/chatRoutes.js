const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

/**
 * POST /api/chat/messages
 * Save user message + return assistant reply
 */
router.post("/messages", async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Save USER message
    await Message.create({
      role: "user",
      content: message,
      session_id: session_id || null,
    });

    // TEMP assistant reply (until AI is added)
    const assistantReply = `You said: "${message}". (AI not connected yet)`;

    const assistantMessage = await Message.create({
      role: "assistant",
      content: assistantReply,
      session_id: session_id || "default",
    });

    // Return exactly what frontend expects
    return res.status(200).json({
      id: assistantMessage._id.toString(),
      role: "assistant",
      content: assistantReply,
      timestamp: assistantMessage.createdAt,
      severity: "mild",
      suggestions: [],
      session_id: assistantMessage.session_id,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * GET /api/chat/messages
 */
router.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

module.exports = router;
