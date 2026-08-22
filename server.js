import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const { Pool } = pg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const SKIN_API =
  "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";

let skinImages = {};

async function loadSkinImages() {
  try {
    const response = await fetch(SKIN_API);
    const skins = await response.json();

    for (const skin of skins) {
      if (skin.name && skin.image) {
        skinImages[skin.name] = skin.image;
              }
    }

    console.log(
      "Картинки скінів завантажені:",
      Object.keys(skinImages).length
    );
  } catch (e) {
    console.error(
      "Не вдалося завантажити картинки скінів:",
      e.message
    );
  }
}

app.set("trust proxy", 1);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL не знайдено");
  process.exit(1);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.RENDER
    ? { rejectUnauthorized: false }
    : false
});

const PgSession = connectPgSimple(session);

app.use(express.json());
app.use(express.static(__dirname));

app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET || "casezone-change-this-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: !!process.env.RENDER,
      maxAge: 1000 * 60 * 60 * 24 * 7
    }
  })
);

async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      balance INTEGER NOT NULL DEFAULT 1000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      value INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS openings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      case_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      item_name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      value INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("PostgreSQL готовий");
}

const cases = [
  {
    id: "red",
    name: "RED CASE",
    price: 100,
    items: [
      ["Nova | Red Quartz", "Consumer", 45, 40],
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
      ["AWP | Dragon Lore", "Contraband", 10, 600000],
      ["★ Butterfly Knife | Doppler", "Covert", 5, 7500],
      ["★ Karambit | Case Hardened", "Rare", 1, 15000]
    ]
  }
];

function auth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Необхідно увійти"
    });
  }

  next();
}

function weightedPick(items) {
  const total = items.reduce((sum, item) => sum + item[2], 0);

  let random =
    crypto.randomInt(0, total * 1000) / 1000;

  for (const item of items) {
    random -= item[2];

    if (random <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

app.get("/api/skins", (req, res) => {
  const skins = Object.entries(skinImages)
    .filter(([name, image]) => name && image)
    .slice(0, 100);

  res.json(skins.map(([name, image]) => ({
    name,
    image
  })));
});

app.get("/api/cases", (req, res) => {
  res.json(cases);
});
app.post("/api/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      !username ||
      !password ||
      username.trim().length < 3 ||
      password.length < 6
    ) {
      return res.status(400).json({
        error: "Логін від 3 символів, пароль від 6"
      });
    }

    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `
      INSERT INTO users
      (username, password_hash, balance)
      VALUES ($1, $2, $3)
      RETURNING id, username, balance
      `,
      [username.trim(), hash, 1000]
    );

    req.session.userId = result.rows[0].id;

    res.json({
      ok: true,
      user: result.rows[0]
    });
  } catch (e) {
    if (e.code === "23505") {
      return res.status(409).json({
        error: "Такий логін уже існує"
      });
    }

    console.error(e);

    res.status(500).json({
      error: "Помилка сервера"
    });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const password = req.body.password || "";

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE username = $1
      `,
      [username]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(password, user.password_hash))
    ) {
      return res.status(401).json({
        error: "Неправильний логін або пароль"
      });
    }

    req.session.userId = user.id;

    res.json({
      ok: true
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Помилка сервера"
    });
  }
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({
      ok: true
    });
  });
});

app.get("/api/me", async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.json({
        user: null
      });
    }

    const result = await pool.query(
      `
      SELECT id, username, balance
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    res.json({
      user: result.rows[0] || null
    });
  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Помилка сервера"
    });
  }
});

app.get("/api/inventory", auth, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        id,
        item_name,
        rarity,
        value,
        created_at
      FROM inventory
      WHERE user_id = $1
      ORDER BY id DESC
      `,
      [req.session.userId]
    );

    res.json(result.rows);
  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Помилка сервера"
    });
  }
});

app.post(
  "/api/inventory/:id/sell",
  auth,
  async (req, res) => {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const itemResult = await client.query(
        `
        SELECT *
        FROM inventory
        WHERE id = $1
        AND user_id = $2
        FOR UPDATE
        `,
        [req.params.id, req.session.userId]
      );

      const item = itemResult.rows[0];

      if (!item) {
        await client.query("ROLLBACK");

        return res.status(404).json({
          error: "Предмет не знайдено"
        });
      }

      await client.query(
        `
        UPDATE users
        SET balance = balance + $1
        WHERE id = $2
        `,
        [item.value, req.session.userId]
      );

      await client.query(
        `
        DELETE FROM inventory
        WHERE id = $1
        AND user_id = $2
        `,
        [item.id, req.session.userId]
      );

      const balanceResult = await client.query(
        `
        SELECT balance
        FROM users
        WHERE id = $1
        `,
        [req.session.userId]
      );

      await client.query("COMMIT");

      res.json({
        ok: true,
        balance: balanceResult.rows[0].balance
      });
    } catch (e) {
      await client.query("ROLLBACK");

      console.error(e);

      res.status(500).json({
        error: "Помилка сервера"
      });
    } finally {
      client.release();
    }
  }
);

app.post("/api/open/:caseId", auth, async (req, res) => {
  const caseData = cases.find(
    c => c.id === req.params.caseId
  );

  if (!caseData) {
    return res.status(404).json({
      error: "Кейс не знайдено"
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await client.query(
      `
      SELECT balance
      FROM users
      WHERE id = $1
      FOR UPDATE
      `,
      [req.session.userId]
    );

    const user = userResult.rows[0];

    if (!user) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        error: "Користувача не знайдено"
      });
    }

    if (user.balance < caseData.price) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        error: "Недостатньо коштів"
      });
    }

    const item = weightedPick(caseData.items);

    await client.query(
      `
      UPDATE users
      SET balance = balance - $1
      WHERE id = $2
      `,
      [caseData.price, req.session.userId]
    );

    await client.query(
      `
      INSERT INTO inventory
      (user_id, item_name, rarity, value)
      VALUES ($1, $2, $3, $4)
      `,
      [
        req.session.userId,
        item[0],
        item[1],
        item[3]
      ]
    );

    await client.query(
      `
      INSERT INTO openings
      (
        user_id,
        case_name,
        price,
        item_name,
        rarity,
        value
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        req.session.userId,
        caseData.name,
        caseData.price,
        item[0],
        item[1],
        item[3]
      ]
    );

    const balanceResult = await client.query(
      `
      SELECT balance
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    await client.query("COMMIT");

    res.json({
      item: {
        name: item[0],
        rarity: item[1],
        value: item[3],
        image: skinImages[item[0]] || null
      },
      balance: balanceResult.rows[0].balance
    });
  } catch (e) {
    await client.query("ROLLBACK");

    console.error(e);

    res.status(500).json({
      error: "Помилка сервера"
    });
  } finally {
    client.release();
  }
});

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});
await loadSkinImages();
await initDatabase();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `CaseZone запущено на порту ${PORT}`
  );
});
