const express = require("express");
const Doctor = require("../models/Doctor");

const router = express.Router();

const defaultDoctors = [
  {
    name: "Dr. Sarah Johnson",
    specialty: "General Physician",
    rating: 4.8,
    experience_years: 9,
    image_url:
      "https://images.pexels.com/photos/5327585/pexels-photo-5327585.jpeg?auto=compress&cs=tinysrgb&w=1200",
    available_slots: ["Mon 10:00 AM", "Mon 3:00 PM", "Tue 11:30 AM", "Wed 2:00 PM"],
  },
  {
    name: "Dr. Michael Chen",
    specialty: "Cardiologist",
    rating: 4.9,
    experience_years: 12,
    image_url:
      "https://images.pexels.com/photos/8460157/pexels-photo-8460157.jpeg?auto=compress&cs=tinysrgb&w=1200",
    available_slots: ["Tue 9:30 AM", "Thu 1:00 PM", "Fri 10:30 AM"],
  },
  {
    name: "Dr. Aisha Patel",
    specialty: "Dermatologist",
    rating: 4.7,
    experience_years: 7,
    image_url:
      "https://images.pexels.com/photos/5215024/pexels-photo-5215024.jpeg?auto=compress&cs=tinysrgb&w=1200",
    available_slots: ["Mon 1:30 PM", "Wed 11:00 AM", "Thu 4:00 PM"],
  },
];

router.get("/", async (req, res) => {
  try {
    const count = await Doctor.countDocuments();
    if (count === 0) {
      await Doctor.insertMany(defaultDoctors);
    }

    const doctors = await Doctor.find().sort({ createdAt: -1 });

    // ✅ Map Mongo _id -> id to match your frontend (doctor.id)
    return res.json(
      doctors.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        specialty: d.specialty,
        rating: d.rating,
        experience_years: d.experience_years,
        image_url: d.image_url,
        available_slots: d.available_slots || [],
      }))
    );
  } catch (err) {
    console.error("GET /api/doctors error:", err);
    return res.status(500).json({ message: "Failed to load doctors" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const d = await Doctor.findById(req.params.id);
    if (!d) return res.status(404).json({ message: "Doctor not found" });

    return res.json({
      id: d._id.toString(),
      name: d.name,
      specialty: d.specialty,
      rating: d.rating,
      experience_years: d.experience_years,
      image_url: d.image_url,
      available_slots: d.available_slots || [],
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load doctor" });
  }
});

module.exports = router;
