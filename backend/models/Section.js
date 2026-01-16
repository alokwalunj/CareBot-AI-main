const mongoose = require("mongoose");

const SectionSchema = new mongoose.Schema(
  {
    title: { type: String, default: "New Chat" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Section", SectionSchema);
