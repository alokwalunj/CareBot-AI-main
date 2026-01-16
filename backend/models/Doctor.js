const mongoose = require("mongoose");

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    specialty: { type: String, required: true },
    rating: { type: Number, default: 4.7 },
    experience_years: { type: Number, default: 5 },
    image_url: { type: String, default: "" },
    available_slots: { type: [String], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Doctor", doctorSchema);
