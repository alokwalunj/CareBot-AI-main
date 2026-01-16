const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
    doctor_id: { type: mongoose.Schema.Types.ObjectId, ref: "Doctor", required: true },
    doctor_name: { type: String, required: true },
    doctor_specialty: { type: String, required: true },

    slot: { type: String, required: true },
    symptoms: { type: String, required: true },
    notes: { type: String, default: "" },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", appointmentSchema);
