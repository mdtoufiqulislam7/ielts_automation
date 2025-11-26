import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/db";
import userRoutes from "./routes/userRoutes";
import profileRoutes from "./routes/profileRoutes";
import examRoutes from "./routes/examRoutes";
import leaderboardRoutes from "./routes/leaderboardRoutes";
import followRoutes from "./routes/followRoutes";
import chatRoutes from "./routes/chatRoutes";

dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());

// Default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// API routes
app.use("/api", userRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/follow", followRoutes);
app.use("/api/chat", chatRoutes);

export default app;
