import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ error: "Name, valid email, and password (8+ characters) are required" });
    }
    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users(name,email,password_hash,role)
       VALUES($1,$2,$3,'student')
       RETURNING user_id AS id, name, email, role`,
      [name.trim(), normalizedEmail, passwordHash]
    );
    const user = result.rows[0];
    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET, { expiresIn: "8h" });
    res.status(201).json({ user, token });
  } catch (err) {
    if (err.code === "23505") return res.status(409).json({ error: "Email already registered" });
    next(err);
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email and password required" });
    const result = await pool.query(
      "SELECT user_id AS id, name, email, password_hash, role FROM users WHERE email=$1",
      [email.trim().toLowerCase()]
    );
    const userRow = result.rows[0];
    if (!userRow || !(await bcrypt.compare(password, userRow.password_hash))) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }
    const user = { id: userRow.id, name: userRow.name, email: userRow.email, role: userRow.role };
    const token = jwt.sign({ sub: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET, { expiresIn: "8h" });
    res.json({ user, token });
  } catch (err) { next(err); }
});

export default router;
