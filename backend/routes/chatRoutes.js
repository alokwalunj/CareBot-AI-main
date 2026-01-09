const express = require("express");
const Message = require("../models/Message");

const router = express.Router();

// Save message
router.post("/messages", async (req, res) => {
  try {
    const { sender, message } = req.body;

    const newMessage = new Message({ sender, message });
    await newMessage.save();

    res.status(201).json({
      success: true,
      message: "Message saved successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all messages
router.get("/messages", async (req, res) => {
  const messages = await Message.find().sort({ createdAt: 1 });
  res.json(messages);
});

module.exports = router;
