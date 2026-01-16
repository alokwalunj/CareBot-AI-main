const express = require("express");
const OpenAI = require("openai");
const Message = require("../models/Message");

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // keep key ONLY in Render env vars
});

const SYSTEM_PROMPT =
  "You are CareBot, a medical assistant. Provide safe, non-diagnostic health guidance. " +
  "Never claim certainty or provide a diagnosis. Encourage consulting a licensed healthcare professional. " +
  "If symptoms sound urgent (chest pain, trouble breathing, severe bleeding, stroke signs), advise emergency services.";

//
// POST /api/chat/messages
//
router.post("/messages", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // Save USER message
    await Message.create({
      role: "user",
      content: message.trim(),
      session_id: "default",
    });

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message.trim() },
      ],
      temperature: 0.4,
    });

    const assistantReply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry — I couldn't generate a response.";

    // Save ASSISTANT message
    const assistantMessage = await Message.create({
      role: "assistant",
      content: assistantReply,
      session_id: "default",
    });

    return res.status(200).json({
      id: assistantMessage._id.toString(),
      role: "assistant",
      content: assistantReply,
      timestamp: assistantMessage.createdAt,
      severity: "mild",
      suggestions: [],
      session_id: "default",
    });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ message: "Server error" });
  }
});

//
// GET /api/chat/messages
//
router.get("/messages", async (req, res) => {
  try {
    const messages = await Message.find({ session_id: "default" }).sort({ createdAt: 1 });
    return res.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    return res.status(500).json({ message: "Failed to fetch messages" });
  }
});

module.exports = router;
