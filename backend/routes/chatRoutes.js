const express = require("express");
const OpenAI = require("openai");
const Message = require("../models/Message");

const router = express.Router();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

router.post("/messages", async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        message: "Server misconfigured: OPENAI_API_KEY is missing in environment variables",
      });
    }

    const sid = session_id || "default";

    // 1) Save USER message
    await Message.create({
      role: "user",
      content: message.trim(),
      session_id: sid,
    });

    // 2) Build short history for context (last 12 messages)
    const history = await Message.find({ session_id: sid })
      .sort({ createdAt: 1 })
      .limit(12);

    const chatMessages = [
      {
        role: "system",
        content:
          "You are CareBot, a medical information assistant. Provide general guidance only, ask clarifying questions, and encourage seeing a clinician for diagnosis. Do not claim to diagnose. If emergency symptoms are mentioned, advise seeking emergency care.",
      },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    // 3) Call OpenAI
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: chatMessages,
      temperature: 0.4,
    });

    const assistantReply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Sorry — I couldn't generate a response.";

    // 4) Save ASSISTANT message
    const assistantMessage = await Message.create({
      role: "assistant",
      content: assistantReply,
      session_id: sid,
    });

    // 5) Return what the frontend expects
    return res.status(200).json({
      id: assistantMessage._id.toString(),
      role: "assistant",
      content: assistantReply,
      timestamp: assistantMessage.createdAt,
      severity: "mild",
      suggestions: [],
      session_id: sid,
    });
  } catch (err) {
    // Log full error in Render logs
    console.error("Chat route error:", err);

    // Send readable error to frontend (no secrets)
    const status = err?.status || err?.response?.status || 500;
    const msg =
      err?.message ||
      err?.response?.data?.error?.message ||
      "Server error";

    return res.status(status).json({ message: msg });
  }
});

router.get("/messages", async (req, res) => {
  try {
    const session_id = req.query.session_id || "default";
    const messages = await Message.find({ session_id }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

module.exports = router;
