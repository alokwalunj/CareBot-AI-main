require("dotenv").config();
const express = require("express");
const cors = require("cors"); // ✅ ADD
const connectDB = require("./config/db");

const chatRoutes = require("./routes/chatRoutes");
const authRoutes = require("./routes/authRoutes");

const app = express();

/**
 * ✅ CORS: allow your Vercel frontend to call this backend
 * If you have multiple Vercel domains (preview + prod), this allows any *.vercel.app.
 */
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (Postman, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow your Vercel domains (prod + preview)
      if (origin.endsWith(".vercel.app")) return callback(null, true);

      // Allow local dev
      if (origin === "http://localhost:5173" || origin === "http://localhost:3000")
        return callback(null, true);

      // Block everything else
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

connectDB();

// Routes
app.use("/api/chat", chatRoutes);
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("CareBot API is running 🚀");
});

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port", process.env.PORT || 5000);
});
