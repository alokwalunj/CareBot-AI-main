const express = require("express");
const OpenAI = require("openai");
const Message = require("../models/Message");
const ChatSession = require("../models/ChatSession");

const router = express.Router();

// OpenAI client (keep key ONLY in Render env: OPENAI_API_KEY)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT =
  "You are CareBot, a medical assistant. You provide safe, non-diagnostic health guidance. " +
  "You must never claim certainty or provide a diagnosis. " +
  "Encourage consulting a licensed healthcare professional when appropriate. " +
  "If symptoms sound urgent (e.g., chest pain, trouble breathing, severe bleeding, stroke signs), advise seeking emergency care.";

/**
 * GET /api/chat/sessions
 * Sidebar list
 */
router.get("/sessions", async (req, res) => {
  try {
    const sessions = await ChatSession.find().sort({ last_message_at: -1 }).lean();

    res.json(
      sessions.map((s) => ({
        id: s._id.toString(),
        title: s.title,
        last_message_at: s.last_message_at,
      }))
    );
  } catch (error) {
    console.error("Sessions list error:", error);
    res.status(500).json({ message: "Failed to load sessions" });
  }
});

/**
 * POST /api/chat/sessions
 * Create a new empty session (optional; frontend can also rely on auto-create in /messages)
 */
router.post("/sessions", async (req, res) => {
  try {
    const title = (req.body?.title || "New Chat").trim();

    const session = await ChatSession.create({
      title: title || "New Chat",
      last_message_at: new Date(),
    });

    res.status(201).json({
      id: session._id.toString(),
      title: session.title,
      last_message_at: session.last_message_at,
    });
  } catch (error) {
    console.error("Create session error:", error);
    res.status(500).json({ message: "Failed to create session" });
  }
});

/**
 * GET /api/chat/sessions/:sessionId/messages
 * Load messages for a session
 */
router.get("/sessions/:sessionId/messages", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const messages = await Message.find({ session_id: sessionId })
      .sort({ createdAt: 1 })
      .lean();

    res.json(
      messages.map((m) => ({
        id: m._id.toString(),
        role: m.role,
        content: m.content,
        timestamp: m.createdAt,
      }))
    );
  } catch (error) {
    console.error("Fetch session messages error:", error);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
});

/**
 * DELETE /api/chat/sessions/:sessionId
 * Delete a session + its messages
 */
router.delete("/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    await ChatSession.deleteOne({ _id: sessionId });
    await Message.deleteMany({ session_id: sessionId });

    res.json({ success: true });
  } catch (error) {
    console.error("Delete session error:", error);
    res.status(500).json({ message: "Failed to delete session" });
  }
});

/**
 * POST /api/chat/messages
 * Body: { message, session_id? }
 * If session_id is missing, auto-create a new session.
 */
router.post("/messages", async (req, res) => {
  try {
    const { message, session_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Message is required" });
    }

    // 1) Ensure session exists (auto-create if missing)
    let session = null;

    if (!session_id) {
      const title = message.trim().slice(0, 40) || "New Chat";
      session = await ChatSession.create({
        title,
        last_message_at: new Date(),
      });
    } else {
      session = await ChatSession.findById(session_id);
      if (!session) return res.status(404).json({ message: "Session not found" });
    }

    // 2) Save USER message
    await Message.create({
      role: "user",
      content: message,
      session_id: session._id,
    });

    // 3) Build context from last N messages in this session (recommended)
    const history = await Message.find({ session_id: session._id })
      .sort({ createdAt: 1 })
      .limit(20)
      .lean();

    const messagesForOpenAI = [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((m) => ({ role: m.role, content: m.content })),
    ];

    // 4) Call OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messagesForOpenAI,
    });

    const assistantReply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I'm sorry — I couldn't generate a response right now.";

    // 5) Save ASSISTANT message
    const assistantMessage = await Message.create({
      role: "assistant",
      content: assistantReply,
      session_id: session._id,
    });

    // 6) Update session last activity (and keep title)
    await ChatSession.updateOne(
      { _id: session._id },
      { $set: { last_message_at: new Date() } }
    );

    // 7) Return what frontend expects
    return res.status(200).json({
      id: assistantMessage._id.toString(),
      role: "assistant",
      content: assistantReply,
      timestamp: assistantMessage.createdAt,
      severity: "mild",
      suggestions: [],
      session_id: session._id.toString(),
    });
  } catch (error) {
    console.error("Chat error:", error);

    // Helpful OpenAI error forwarding (without leaking secrets)
    const msg =
      error?.message?.includes("insufficient_quota")
        ? "OpenAI quota exceeded. Check billing/credits."
        : "Server error";

    res.status(500).json({ message: msg });
  }
});

module.exports = router;
