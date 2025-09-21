import express from "express";
import dotenv from "dotenv";
import { connectMongo } from "./config/mongo.js";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";

dotenv.config();

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
  ],
  credentials: true,
};

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);

// MongoDB Connect
(async () => {
  try {
    await connectMongo();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Startup error:", err);
    process.exit(1);
  }
})();