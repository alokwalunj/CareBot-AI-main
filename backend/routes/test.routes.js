import express from "express";
import TestUser from "../models/TestUser.js";

const router = express.Router();

// POST → Save data to MongoDB
router.post("/add", async (req, res) => {
  try {
    const user = await TestUser.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET → Fetch data from MongoDB
router.get("/", async (req, res) => {
  const users = await TestUser.find();
  res.json(users);
});

export default router;
