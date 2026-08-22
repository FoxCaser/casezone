import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const db = new Database("casezone.db");

app.use(express.json());
app.use(express.static(__dirname));
app.use(session({
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: "lax", secure: false, maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS openings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  case_name TEXT NOT NULL,
  price INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  rarity TEXT NOT NULL,
  value INTEGER NOT NULL,
  created_at TEXT NOT NULL
);
`);
db.prepare("UPDATE users SET balance = 1000 WHERE username = ?").run("test22222");

const cases = [
  {
    id: "red",
    name: "RED CASE",
    price: 100,
    items: [
      ["Nova | Red Quartz", "Consumer", 40, 45],
      ["AK-47 | Elite Build", "Mil-Spec", 25, 90],
      ["M4A1-S | Basilisk", "Restricted", 15, 160],
      ["AWP | Redline", "Classified", 10, 350],
      ["★ Karambit | Doppler", "Covert", 2, 2500]
    ]
  },
  {
    id: "epic",
    name: "EPIC CASE",
    price: 250,
    items: [
      ["Glock-18 | Vogue", "Mil-Spec", 35, 110],
      ["USP-S | Cortex", "Restricted", 25, 190],
      ["AK-47 | Neon Rider", "Classified", 18, 500],
      ["AWP | Asiimov", "Covert", 10, 1400],
      ["★ M9 Bayonet | Doppler", "Covert", 2, 5000]
    ]
  },
  {
    id: "legend",
    name: "LEGEND CASE",
    price: 500,
    items: [
      ["M4A1-S | Printstream", "Classified", 35, 600],
      ["AK-47 | Fire Serpent", "Covert", 25, 1800],
      ["AWP | Dragon Lore", "Contraband", 10, 9000],
      ["★ Butterfly Knife | Doppler", "Covert", 5, 7500],
      ["★ Karambit | Case Hardened", "Rare", 1, 15000]
    ]
  }
];

function auth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: "Необхідно увійти" });
  next();
}

function now() { return new Date().toISOString(); }

function weightedPick(items) {
  const total = items.reduce((s, x) => s + x[2], 0);
  let r = crypto.randomInt(0, total * 1000) / 1000;
  for (const item of items) {
    r -= item[2];
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

app.get("/api/cases", (req, res) => res.json(cases.map(({items, ...c}) => c)));

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password || username.length < 3 || password.length < 6)
    return res.status(400).json({ error: "Логін від 3 символів, пароль від 6" });
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare("INSERT INTO users (username,password_hash,created_at) VALUES (?,?,?)")
      .run(username.trim(), hash, now());
    req.session.userId = result.lastInsertRowid;
    res.json({ ok: true });
  } catch {
    res.status(409).json({ error: "Такий логін уже існує" });
  }
});

app.post("/api/login", async (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(req.body.username?.trim());
  if (!user || !(await bcrypt.compare(req.body.password || "", user.password_hash)))
    return res.status(401).json({ error: "Неправильний логін або пароль" });
  req.session.userId = user.id;
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get("/api/me", (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  const user = db.prepare("SELECT id,username,balance FROM users WHERE id=?").get(req.session.userId);
  res.json({ user });
});

app.get("/api/inventory", auth, (req, res) => {
  res.json(db.prepare("SELECT id,item_name,rarity,value,created_at FROM inventory WHERE user_id=? ORDER BY id DESC")
    .all(req.session.userId));
});

/* TEST TOP-UP:
   This endpoint is intentionally disabled for public deployment.
   Connect a real payment provider webhook here only after configuring
   merchant credentials, payment verification, limits, refunds and legal compliance.
*/
app.post("/api/test-topup", auth, (req, res) => {
  const amount = Number(req.body.amount);
  if (![100, 250, 500, 1000].includes(amount))
    return res.status(400).json({ error: "Недоступна сума тестового поповнення" });
  db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(amount, req.session.userId);
  res.json({ ok: true });
});

app.post("/api/open/:caseId", auth, (req, res) => {
  const c = cases.find(x => x.id === req.params.caseId);
  if (!c) return res.status(404).json({ error: "Кейс не знайдено" });

  const user = db.prepare("SELECT balance FROM users WHERE id=?").get(req.session.userId);
  if (user.balance < c.price) return res.status(400).json({ error: "Недостатньо коштів" });

  const item = weightedPick(c.items);
  const tx = db.transaction(() => {
    db.prepare("UPDATE users SET balance=balance-? WHERE id=?").run(c.price, req.session.userId);
    db.prepare("INSERT INTO inventory(user_id,item_name,rarity,value,created_at) VALUES(?,?,?,?,?)")
      .run(req.session.userId, item[0], item[1], item[3], now());
    db.prepare("INSERT INTO openings(user_id,case_name,price,item_name,rarity,value,created_at) VALUES(?,?,?,?,?,?,?)")
      .run(req.session.userId, c.name, c.price, item[0], item[1], item[3], now());
  });
  tx();

  const updated = db.prepare("SELECT balance FROM users WHERE id=?").get(req.session.userId);
  res.json({ item: { name: item[0], rarity: item[1], value: item[3] }, balance: updated.balance });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(process.env.PORT || 3000, () => {
  console.log("CaseZone running on http://localhost:" + (process.env.PORT || 3000));
});
