const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "New Chat" },
    last_message_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
