require("dotenv").config();
const express = require("express");
const connectDB = require("./config/db");
const chatRoutes = require("./routes/chatRoutes");
// const testRoutes = require("./routes/test.routes.js");

const app = express();
app.use(express.json());

// app.use("/api/test", testRoutes);

connectDB();

app.use("/api", chatRoutes);

app.listen(process.env.PORT || 5000, () => {
  console.log("Server running on port", process.env.PORT || 5000);
});
