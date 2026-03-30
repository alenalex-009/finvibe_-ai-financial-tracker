import express from "express";
import pkg from "pg";
import cors from "cors";

const { Pool } = pkg;

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection (Neon)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Middleware
app.use(express.json());

// Allow all origins (for testing)
app.use(cors({
  origin: true,
}));

// 🔥 Fake user middleware (NO AUTH)
const fakeUser = (req: any, res: any, next: any) => {
  req.userId = "test-user";
  next();
};

// ================= TRANSACTIONS =================

app.get("/api/transactions", fakeUser, async (req: any, res) => {
  const result = await pool.query(
    "SELECT * FROM transactions WHERE user_id = $1 ORDER BY date DESC",
    [req.userId]
  );

  res.json(result.rows);
});

app.post("/api/transactions", fakeUser, async (req: any, res) => {
  const { amount, category, description, date, type } = req.body;
  const id = crypto.randomUUID();

  await pool.query(
    "INSERT INTO transactions (id, user_id, amount, category, description, date, type) VALUES ($1,$2,$3,$4,$5,$6,$7)",
    [id, req.userId, amount, category, description, date, type]
  );

  res.json({ id, amount, category, description, date, type });
});

app.delete("/api/transactions/:id", fakeUser, async (req: any, res) => {
  await pool.query(
    "DELETE FROM transactions WHERE id = $1 AND user_id = $2",
    [req.params.id, req.userId]
  );

  res.json({ success: true });
});

// ================= BUDGET =================

app.get("/api/budget", fakeUser, async (req: any, res) => {
  const result = await pool.query(
    "SELECT amount FROM budgets WHERE user_id = $1",
    [req.userId]
  );

  res.json({ amount: result.rows[0]?.amount || 50000 });
});

app.post("/api/budget", fakeUser, async (req: any, res) => {
  const { amount } = req.body;

  await pool.query(
    "INSERT INTO budgets (user_id, amount) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET amount = $2",
    [req.userId, amount]
  );

  res.json({ amount });
});

// ================= START SERVER =================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});