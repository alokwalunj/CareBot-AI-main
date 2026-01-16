const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    // SIMPLE session handling (single conversation)
    session_id: {
      type: String,
      default: "default",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", messageSchema);
