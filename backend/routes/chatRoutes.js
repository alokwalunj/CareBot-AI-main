const express = require("express");
const OpenAI = require("openai");
const Section = require("../models/Section");
const Message = require("../models/Message");

const router = express.Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT =
  "You are CareBot, a medical assistant. You provide safe, non-diagnostic health guidance. " +
  "You must never give a diagnosis or claim certainty. Encourage consulting a licensed healthcare professional when appropriate. " +
  "If emergency symptoms are mentioned (chest pain, trouble breathing, severe bleeding, stroke signs, suicidal intent), advise immediate emergency help.";

/**
 * GET /api/chat/sessions
 * List sessions (latest first)
 */
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await ChatSession.find()
      .sort({ updatedAt: -1 })
      .limit(50);

    res.json(
      sessions.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        last_message_at: s.updatedAt,
        created_at: s.createdAt,
      }))
    );
  } catch (err) {
    console.error("GET /sessions error:", err);
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

/**
 * GET /api/chat/sessions/:sessionId/messages
 * Fetch messages for a session
 */
router.get("/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const messages = await Message.find({ session_id: sessionId })
      .sort({ createdAt: 1 });

    res.json(
      messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        timestamp: m.createdAt,
        session_id: m.session_id,
      }))
    );
  } catch (err) {
    console.error("GET /sessions/:id/messages error:", err);
    res.status(500).json({ message: "Failed to fetch session messages" });
  }
});

/**
 * DELETE /api/chat/sessions/:sessionId
 * Delete a session and its messages
 */
router.delete("/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Message.deleteMany({ session_id: sessionId });
    await ChatSession.findByIdAndDelete(sessionId);

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /sessions/:id error:", err);
    res.status(500).json({ message: "Failed to delete session" });
  }
});

/**
 * POST /api/chat/messages
 * Body: { message, session_id? }
 * If no session_id -> create a new session
 * Saves user message + assistant reply
 */
router.post("/messages", async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message || !String(message).trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    let sessionId = session_id;

    // Create session if missing
    if (!sessionId) {
      const title = String(message).trim().split(/\s+/).slice(0, 6).join(" ");
      const newSession = await ChatSession.create({
        title: title.length ? title : "New Chat",
      });
      sessionId = newSession._id.toString();
    }

    // Save USER message
    await Message.create({
      role: "user",
      content: String(message).trim(),
      session_id: sessionId,
    });

    // Build conversation history (last 20 msgs for context)
    const history = await Message.find({ session_id: sessionId })
      .sort({ createdAt: 1 })
      .limit(20);

    const openaiMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: openaiMessages,
    });

    const assistantReply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I'm sorry, I couldn't generate a response.";

    const assistantMessage = await Message.create({
      role: "assistant",
      content: assistantReply,
      session_id: sessionId,
    });

    // Touch session updatedAt
    await ChatSession.findByIdAndUpdate(sessionId, {}, { new: true });

    return res.status(200).json({
      id: assistantMessage._id.toString(),
      role: "assistant",
      content: assistantReply,
      timestamp: assistantMessage.createdAt,
      severity: "mild",
      suggestions: [],
      session_id: sessionId,
    });
  } catch (err) {
    console.error("POST /messages error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
