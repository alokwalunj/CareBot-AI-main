const express = require("express");
const OpenAI = require("openai");
const Message = require("../models/Message");

const router = express.Router();

// Initialize OpenAI client using ENV variable
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * POST /api/chat/messages
 * Save user message + get AI reply
 */
router.post("/messages", async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message is required" });
    }

    // 1️⃣ Save USER message
    await Message.create({
      role: "user",
      content: message,
      session_id: session_id || "default",
    });

    // 2️⃣ Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are CareBot, a medical assistant. You provide safe, non-diagnostic health guidance. You must never give a diagnosis. Always advise consulting a licensed healthcare professional.",
        },
        {
          role: "user",
          content: message,
        },
      ],
    });

    const assistantReply =
      completion.choices[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response.";

    // 3️⃣ Save ASSISTANT message
    const assistantMessage = await Message.create({
      role: "assistant",
      content: assistantReply,
      session_id: session_id || "default",
    });

    // 4️⃣ Send response to frontend
    res.status(200).json({
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
