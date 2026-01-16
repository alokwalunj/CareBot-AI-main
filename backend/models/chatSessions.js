const mongoose = require("mongoose");

const chatSessionSchema = new mongoose.Schema(
  {
    user_id: { type: String, required: true }, // keep string for now (from auth)
    title: { type: String, default: "New Chat" },
    last_message_at: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChatSession", chatSessionSchema);
