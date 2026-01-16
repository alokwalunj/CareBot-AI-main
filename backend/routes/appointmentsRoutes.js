const express = require("express");
const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");

const router = express.Router();

// Create appointment
router.post("/", async (req, res) => {
  try {
    const { doctor_id, slot, symptoms, notes } = req.body;

    if (!doctor_id || !slot || !symptoms) {
      return res.status(400).json({ message: "doctor_id, slot, and symptoms are required" });
    }

    const doctor = await Doctor.findById(doctor_id);
    if (!doctor) return res.status(404).json({ message: "Doctor not found" });

    const appt = await Appointment.create({
      doctor_id: doctor._id,
      doctor_name: doctor.name,
      doctor_specialty: doctor.specialty,
      slot,
      symptoms,
      notes: notes || "",
      status: "scheduled",
    });

    return res.status(201).json({
      id: appt._id.toString(),
      doctor_name: appt.doctor_name,
      doctor_specialty: appt.doctor_specialty,
      slot: appt.slot,
      symptoms: appt.symptoms,
      notes: appt.notes,
      status: appt.status,
      created_at: appt.createdAt,
    });
  } catch (err) {
    console.error("POST /api/appointments error:", err);
    return res.status(500).json({ message: "Failed to book appointment" });
  }
});

// Get all appointments
router.get("/", async (req, res) => {
  try {
    const appts = await Appointment.find().sort({ createdAt: -1 });

    return res.json(
      appts.map((a) => ({
        id: a._id.toString(),
        doctor_name: a.doctor_name,
        doctor_specialty: a.doctor_specialty,
        slot: a.slot,
        symptoms: a.symptoms,
        notes: a.notes,
        status: a.status,
        created_at: a.createdAt,
      }))
    );
  } catch (err) {
    return res.status(500).json({ message: "Failed to load appointments" });
  }
});

// Cancel appointment
router.patch("/:id/cancel", async (req, res) => {
  try {
    const appt = await Appointment.findById(req.params.id);
    if (!appt) return res.status(404).json({ message: "Appointment not found" });

    appt.status = "cancelled";
    await appt.save();

    return res.json({
      success: true,
      id: appt._id.toString(),
      status: appt.status,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to cancel appointment" });
  }
});

module.exports = router;
