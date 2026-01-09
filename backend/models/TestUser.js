import mongoose from "mongoose";

const testUserSchema = new mongoose.Schema(
  {
    name: String,
    email: String
  },
  { timestamps: true }
);

export default mongoose.model("TestUser", testUserSchema);
