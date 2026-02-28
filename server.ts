import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("maestria.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    is_pro INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    asset TEXT,
    type TEXT,
    direction TEXT,
    entry_time TEXT,
    entry_price REAL,
    stop_loss REAL,
    take_profit REAL,
    exit_time TEXT,
    exit_price REAL,
    risk_amount REAL,
    lot REAL,
    result_cash REAL,
    result_r REAL,
    setup TEXT,
    market_condition TEXT,
    is_planned INTEGER,
    emotion TEXT,
    followed_plan INTEGER,
    discipline_note INTEGER,
    what_did_right TEXT,
    what_did_wrong TEXT,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key";

  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  };

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    try {
      const info = db.prepare("INSERT INTO users (email, password) VALUES (?, ?)").run(email, hashedPassword);
      const token = jwt.sign({ id: info.lastInsertRowid, email }, JWT_SECRET);
      res.json({ token, user: { id: info.lastInsertRowid, email, is_pro: 0 } });
    } catch (e) {
      res.status(400).json({ error: "Email already exists" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign({ id: user.id, email }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email, is_pro: user.is_pro } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Trade Routes
  app.get("/api/trades", authenticateToken, (req: any, res) => {
    const trades = db.prepare("SELECT * FROM trades WHERE user_id = ? ORDER BY date DESC, entry_time DESC").all(req.user.id);
    res.json(trades);
  });

  app.post("/api/trades", authenticateToken, (req: any, res) => {
    const t = req.body;
    const result_cash = (t.exit_price - t.entry_price) * (t.direction === "Compra" ? 1 : -1) * t.lot;
    const result_r = t.risk_amount > 0 ? result_cash / t.risk_amount : 0;

    const stmt = db.prepare(`
      INSERT INTO trades (
        user_id, date, asset, type, direction, entry_time, entry_price, stop_loss, take_profit,
        exit_time, exit_price, risk_amount, lot, result_cash, result_r, setup,
        market_condition, is_planned, emotion, followed_plan, discipline_note,
        what_did_right, what_did_wrong
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const info = stmt.run(
      req.user.id, t.date, t.asset, t.type, t.direction, t.entry_time, t.entry_price, t.stop_loss, t.take_profit,
      t.exit_time, t.exit_price, t.risk_amount, t.lot, result_cash, result_r, t.setup,
      t.market_condition, t.is_planned ? 1 : 0, t.emotion, t.followed_plan ? 1 : 0, t.discipline_note,
      t.what_did_right, t.what_did_wrong
    );

    res.json({ id: info.lastInsertRowid, result_cash, result_r });
  });

  app.delete("/api/trades/:id", authenticateToken, (req: any, res) => {
    db.prepare("DELETE FROM trades WHERE id = ? AND user_id = ?").run(req.params.id, req.user.id);
    res.sendStatus(200);
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
