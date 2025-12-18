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
import resultRoutes from "./routes/resultRoutes";

dotenv.config();

const app: Application = express();

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const startTime = Date.now();
  
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl || req.url}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  // Log request details
  if (req.query && Object.keys(req.query).length > 0) {
    console.log('📥 Query:', JSON.stringify(req.query, null, 2));
  }
  if (req.params && Object.keys(req.params).length > 0) {
    console.log('📥 Params:', JSON.stringify(req.params, null, 2));
  }
  if (req.body && Object.keys(req.body).length > 0) {
    // Hide sensitive data
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '***';
    if (sanitizedBody.token) sanitizedBody.token = '***';
    console.log('📥 Body:', JSON.stringify(sanitizedBody, null, 2));
  }
  
  // Log response
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.send = function(data: any) {
    const duration = Date.now() - startTime;
    console.log(`📤 Response [${res.statusCode}] - ${duration}ms`);
    if (data) {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        console.log('📤 Data:', JSON.stringify(parsed, null, 2));
      } catch (e) {
        console.log('📤 Data:', String(data).substring(0, 200));
      }
    }
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return originalSend.call(this, data);
  };
  
  res.json = function(data: any) {
    const duration = Date.now() - startTime;
    console.log(`📤 Response [${res.statusCode}] - ${duration}ms`);
    console.log('📤 Data:', JSON.stringify(data, null, 2));
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return originalJson.call(this, data);
  };
  
  next();
});

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
app.use("/api/results", resultRoutes);

export default app;
