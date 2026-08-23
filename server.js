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
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS steam_id TEXT UNIQUE;
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
    await pool.query(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
      steam_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      value INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'liqpay',
      transaction_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
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
  },

  {
    id: "bronze",
    name: "BRONZE CASE",
    price: 50,
    items: [
      ["MP9 | Food Chain", "Mil-Spec", 40, 70],
      ["Glock-18 | Moonrise", "Mil-Spec", 30, 80],
      ["AK-47 | Slate", "Restricted", 18, 180],
      ["AWP | Mortis", "Classified", 10, 300],
      ["★ Falchion Knife | Night", "Covert", 2, 1800]
    ]
  },

  {
    id: "silver",
    name: "SILVER CASE",
    price: 200,
    items: [
      ["USP-S | Ticket to Hell", "Mil-Spec", 35, 120],
      ["M4A4 | Magnesium", "Mil-Spec", 28, 150],
      ["AK-47 | Ice Coaled", "Restricted", 20, 350],
      ["AWP | Neo-Noir", "Classified", 12, 700],
      ["★ Huntsman Knife | Doppler", "Covert", 5, 3500]
    ]
  },

  {
    id: "gold",
    name: "GOLD CASE",
    price: 400,
    items: [
      ["FAMAS | Commemoration", "Mil-Spec", 32, 180],
      ["M4A1-S | Hyper Beast", "Restricted", 28, 500],
      ["AK-47 | Bloodsport", "Classified", 20, 1000],
      ["AWP | Hyper Beast", "Covert", 15, 1800],
      ["★ Bayonet | Doppler", "Covert", 5, 6000]
    ]
  },

  {
    id: "fire",
    name: "FIRE CASE",
    price: 750,
    items: [
      ["Glock-18 | Water Elemental", "Restricted", 30, 300],
      ["M4A1-S | Chantico's Fire", "Classified", 25, 900],
      ["AK-47 | Vulcan", "Covert", 20, 2200],
      ["AWP | Wildfire", "Covert", 15, 3000],
      ["★ Butterfly Knife | Slaughter", "Covert", 3, 9000]
    ]
  },

  {
    id: "dragon",
    name: "DRAGON CASE",
    price: 1000,
    items: [
      ["USP-S | Kill Confirmed", "Classified", 30, 900],
      ["M4A1-S | Golden Coil", "Covert", 25, 1800],
      ["AK-47 | The Empress", "Covert", 20, 2500],
      ["AWP | Oni Taiji", "Covert", 15, 3500],
      ["★ Karambit | Doppler", "Covert", 3, 12000]
    ]
  },

  {
    id: "knife",
    name: "KNIFE CASE",
    price: 1500,
    items: [
      ["★ Navaja Knife | Doppler", "Covert", 35, 2200],
      ["★ Gut Knife | Doppler", "Covert", 25, 2800],
      ["★ Falchion Knife | Doppler", "Covert", 20, 3500],
      ["★ Bayonet | Doppler", "Covert", 12, 6500],
      ["★ Karambit | Doppler", "Covert", 3, 12000]
    ]
  },

  {
    id: "premium",
    name: "PREMIUM CASE",
    price: 2500,
    items: [
      ["AK-47 | Asiimov", "Covert", 30, 3000],
      ["M4A1-S | Printstream", "Covert", 25, 4500],
      ["AWP | Asiimov", "Covert", 20, 5000],
      ["★ M9 Bayonet | Doppler", "Covert", 12, 10000],
      ["★ Butterfly Knife | Doppler", "Covert", 5, 18000]
    ]
  },

  {
    id: "black",
    name: "BLACK MARKET",
    price: 5000,
    items: [
      ["AK-47 | Fire Serpent", "Covert", 30, 1800],
      ["AWP | Lightning Strike", "Covert", 25, 8000],
      ["M4A4 | Howl", "Contraband", 15, 25000],
      ["★ Karambit | Case Hardened", "Rare", 8, 15000],
      ["AWP | Dragon Lore", "Contraband", 2, 600000]
    ]
  },

  {
    id: "ultimate",
    name: "ULTIMATE CASE",
    price: 10000,
    items: [
      ["AK-47 | Wild Lotus", "Covert", 35, 25000],
      ["AWP | Gungnir", "Covert", 25, 35000],
      ["M4A4 | Howl", "Contraband", 15, 25000],
      ["★ Butterfly Knife | Gamma Doppler", "Covert", 8, 30000],
      ["AWP | Dragon Lore", "Contraband", 2, 600000]
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
    

  res.json(skins.map(([name, image]) => ({
    name,
    image
  })));
});

app.get("/api/cases", (req, res) => {
  res.json(cases);
});

    console.error(e);

    res.status(500).json({
      error: "Помилка сервера"
    });
  }
});

app.post("/api/withdraw/:inventoryId", auth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const inventoryResult = await client.query(
      `
      SELECT *
      FROM inventory
      WHERE id = $1
        AND user_id = $2
      FOR UPDATE
      `,
      [req.params.inventoryId, req.session.userId]
    );

    const item = inventoryResult.rows[0];

    if (!item) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Предмет не знайдено"
      });
    }

    const userResult = await client.query(
      `
      SELECT steam_id
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    const user = userResult.rows[0];

    if (!user || !user.steam_id) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Спочатку увійдіть через Steam"
      });
    }

    const withdrawal = await client.query(
      `
      INSERT INTO withdrawals
        (user_id, inventory_id, steam_id, item_name, value)
      VALUES
        ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        req.session.userId,
        item.id,
        user.steam_id,
        item.item_name,
        item.value
      ]
    );

    await client.query("COMMIT");

    res.json({
      ok: true,
      withdrawalId: withdrawal.rows[0].id
    });

  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);

    res.status(500).json({
      error: "Помилка створення заявки"
    });
  } finally {
    client.release();
  }
});
app.get("/api/withdrawals", auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      `
      SELECT steam_id
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    const user = userResult.rows[0];

    if (!user || user.steam_id !== "76561199848778920") {
      return res.status(403).json({
        error: "Доступ заборонено"
      });
    }

    const result = await pool.query(`
      SELECT
        id,
        steam_id,
        item_name,
        value,
        status,
        created_at
      FROM withdrawals
      ORDER BY id DESC
    `);

    res.json(result.rows);

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Помилка отримання заявок"
    });
  }
});
app.post("/api/withdrawals/:id/status", auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      `
      SELECT steam_id
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    const user = userResult.rows[0];

    if (!user || user.steam_id !== "76561199848778920") {
      return res.status(403).json({
        error: "Доступ заборонено"
      });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        error: "Невірний статус"
      });
    }

    const result = await pool.query(
      `
      UPDATE withdrawals
      SET status = $1
      WHERE id = $2
        AND status = 'pending'
      RETURNING id, status
      `,
      [status, req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Заявка не знайдена або вже оброблена"
      });
    }

    res.json({
      ok: true,
      withdrawal: result.rows[0]
    });

  } catch (e) {
    console.error(e);

    res.status(500).json({
      error: "Помилка зміни статусу"
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

app.get("/auth/steam", (req, res) => {
  const returnUrl =
    "https://casezone.onrender.com/auth/steam/callback";

  const realm =
    "https://casezone.onrender.com/";

  const params = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": returnUrl,
    "openid.realm": realm,
    "openid.identity":
      "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id":
      "http://specs.openid.net/auth/2.0/identifier_select"
  });

  res.redirect(
    "https://steamcommunity.com/openid/login?" +
    params.toString()
  );
});

app.get("/auth/steam/callback", async (req, res) => {
  try {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") {
        params.set(key, value);
      }
    }

    const claimedId = params.get("openid.claimed_id");
    const returnTo = params.get("openid.return_to");

    if (!claimedId) {
      return res.status(400).send("SteamID не отримано");
    }

    if (
      returnTo !==
      "https://casezone.onrender.com/auth/steam/callback"
    ) {
      return res.status(400).send("Невірний callback");
    }

    params.set("openid.mode", "check_authentication");

    const verifyResponse = await fetch(
      "https://steamcommunity.com/openid/login",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded"
        },
        body: params.toString()
      }
    );

    const verification = await verifyResponse.text();

    if (!verification.includes("is_valid:true")) {
      return res.status(401).send(
        "Steam не підтвердив авторизацію"
      );
    }

    const steamId = claimedId.split("/").pop();

    let result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE steam_id = $1
      `,
      [steamId]
    );

    let user = result.rows[0];

    if (!user) {
      const username = "Steam_" + steamId.slice(-8);

      const randomPassword =
        crypto.randomBytes(32).toString("hex");

      const passwordHash =
        await bcrypt.hash(randomPassword, 10);

      result = await pool.query(
        `
        INSERT INTO users
          (username, password_hash, steam_id)
        VALUES
          ($1, $2, $3)
        RETURNING *
        `,
        [
          username,
          passwordHash,
          steamId
        ]
      );

      user = result.rows[0];
    }

    req.session.userId = user.id;

    res.redirect("/");
  } catch (e) {
    console.error(e);

    res.status(500).send(
      "Помилка входу через Steam"
    );
  }
});
app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});
app.get("/admin", auth, async (req, res) => {
  try {
    const userResult = await pool.query(
      `
      SELECT steam_id
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    const user = userResult.rows[0];

    if (!user || user.steam_id !== "76561199848778920") {
      return res.status(403).send("Доступ заборонено");
    }

    res.sendFile(
      path.join(__dirname, "admin.html")
    );

  } catch (e) {
    console.error(e);
    res.status(500).send("Помилка сервера");
  }
});
await loadSkinImages();
await initDatabase();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `CaseZone запущено на порту ${PORT}`
  );
});
