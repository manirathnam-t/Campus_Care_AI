import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import authRoutes from "./routes/auth.js";
import complaintRoutes from "./routes/complaints.js";
import { pool } from "./db.js";

dotenv.config();
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("Set JWT_SECRET to a random secret with at least 32 characters in .env");
}
const app = express();
app.disable("x-powered-by");
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5500" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 30 }), authRoutes);
app.use("/api/complaints", rateLimit({ windowMs: 15 * 60 * 1000, limit: 120 }), complaintRoutes);
app.get("/api/health", async (_req, res, next) => {
  try { await pool.query("SELECT 1"); res.json({ ok: true, database: "connected" }); }
  catch (err) { next(err); }
});
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});
const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`CampusCare API listening on http://localhost:${port}`));
