import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("finvibe.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    risk_profile TEXT DEFAULT 'medium'
  );
`);

// Migration: Add risk_profile if it doesn't exist (for existing DBs)
try {
  db.prepare("ALTER TABLE users ADD COLUMN risk_profile TEXT DEFAULT 'medium'").run();
} catch (e) {
  // Column already exists or other error
}

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    date TEXT NOT NULL,
    type TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS budgets (
    user_id TEXT PRIMARY KEY,
    amount REAL NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(cookieParser("finvibe-secret"));

  // Auth Middleware
  const authenticate = (req: any, res: any, next: any) => {
    const userId = req.signedCookies.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    req.userId = userId;
    next();
  };

  // Auth Routes
  app.post("/api/auth/signup", async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = crypto.randomUUID();
      db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)").run(userId, name, email, hashedPassword);
      res.cookie("userId", userId, { signed: true, httpOnly: true, sameSite: "none", secure: true });
      res.json({ id: userId, name, email, riskProfile: 'medium' });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    res.cookie("userId", user.id, { signed: true, httpOnly: true, sameSite: "none", secure: true });
    res.json({ id: user.id, name: user.name, email: user.email, riskProfile: user.risk_profile });
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("userId");
    res.json({ success: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = req.signedCookies.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user: any = db.prepare("SELECT id, name, email, risk_profile as riskProfile FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    res.json(user);
  });

  app.post("/api/auth/profile", authenticate, (req: any, res) => {
    const { riskProfile } = req.body;
    db.prepare("UPDATE users SET risk_profile = ? WHERE id = ?").run(riskProfile, req.userId);
    res.json({ success: true });
  });

  // Transaction Routes
  app.get("/api/transactions", authenticate, (req: any, res) => {
    const transactions = db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC").all(req.userId);
    res.json(transactions);
  });

  app.post("/api/transactions", authenticate, (req: any, res) => {
    const { amount, category, description, date, type } = req.body;
    const id = crypto.randomUUID();
    db.prepare("INSERT INTO transactions (id, user_id, amount, category, description, date, type) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(id, req.userId, amount, category, description, date, type);
    res.json({ id, amount, category, description, date, type });
  });

  app.delete("/api/transactions/:id", authenticate, (req: any, res) => {
    db.prepare("DELETE FROM transactions WHERE id = ? AND user_id = ?").run(req.params.id, req.userId);
    res.json({ success: true });
  });

  // Budget Routes
  app.get("/api/budget", authenticate, (req: any, res) => {
    const budget: any = db.prepare("SELECT amount FROM budgets WHERE user_id = ?").get(req.userId);
    res.json({ amount: budget?.amount || 50000 });
  });

  app.post("/api/budget", authenticate, (req: any, res) => {
    const { amount } = req.body;
    db.prepare("INSERT OR REPLACE INTO budgets (user_id, amount) VALUES (?, ?)").run(req.userId, amount);
    res.json({ amount });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
