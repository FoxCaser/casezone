import express from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import pg from "pg";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";
import SteamUser from "steam-user";
import TradeOfferManager from "steam-tradeoffer-manager";

const { Pool } = pg;
const steamClient = new SteamUser({
  renewRefreshTokens: true
});
const tradeManager = new TradeOfferManager({
  steam: steamClient,
  language: "en"
});

steamClient.on("loggedOn", () => {
  console.log(
    "Steam бот увійшов:",
    steamClient.steamID.getSteamID64()
  );
});

steamClient.on("error", (err) => {
  console.error("Steam бот помилка:", err);
});

if (process.env.STEAM_BOT_REFRESH_TOKEN) {
  steamClient.logOn({
    refreshToken: process.env.STEAM_BOT_REFRESH_TOKEN
  });
} else {
  console.error("STEAM_BOT_REFRESH_TOKEN не налаштований");
}
const __dirname = path.dirname(
  fileURLToPath(import.meta.url)
);

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
app.use(
  express.urlencoded({
    extended: true
  })
);

app.use(express.static(__dirname));

app.get("/skins.html", (req, res) => {
  res.sendFile(
    path.join(__dirname, "skins.html")
  );
});

app.use(
  session({
    store: new PgSession({
      pool,
      createTableIfMissing: true
    }),
    secret:
      process.env.SESSION_SECRET ||
      "casezone-change-this-secret",
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
      balance NUMERIC(12,2) NOT NULL DEFAULT 1000,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS steam_id TEXT UNIQUE;
  `);

  await pool.query(`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS trade_url TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      item_name TEXT NOT NULL,
      rarity TEXT NOT NULL,
      value INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
  ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available';
`);

  await pool.query(`
  ALTER TABLE inventory
  ADD COLUMN IF NOT EXISTS assetid TEXT;
`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS openings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
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
      user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      inventory_id INTEGER NOT NULL
        REFERENCES inventory(id)
        ON DELETE CASCADE,
      steam_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      value INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    ALTER TABLE withdrawals
    ADD COLUMN IF NOT EXISTS trade_offer_id TEXT;
  `);

  await pool.query(`
    ALTER TABLE withdrawals
    ADD COLUMN IF NOT EXISTS trade_url TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      amount INTEGER NOT NULL,
      provider TEXT NOT NULL DEFAULT 'liqpay',
      transaction_id TEXT UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS skin_deposit_requests (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL
        REFERENCES users(id)
        ON DELETE CASCADE,
      skin_name TEXT NOT NULL,
      skin_image TEXT,
      value NUMERIC(10,2) NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
    await pool.query(`
    ALTER TABLE skin_deposit_requests
    ADD COLUMN IF NOT EXISTS assetid TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS site_inventory (
      id SERIAL PRIMARY KEY,
      item_name TEXT NOT NULL,
      image TEXT,
      value NUMERIC(10,2) NOT NULL,
      source_user_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,
      deposit_request_id INTEGER,
      status TEXT NOT NULL DEFAULT 'available',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  await pool.query(`
  ALTER TABLE site_inventory
  ADD COLUMN IF NOT EXISTS assetid TEXT;
`);
 
  await pool.query(`
    ALTER TABLE site_inventory
    ALTER COLUMN value TYPE NUMERIC(10,2)
    USING value::numeric;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS steam_inventory_cache (
      steam_id TEXT PRIMARY KEY,
      inventory JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  console.log("PostgreSQL готовий");
}

function auth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: "Необхідно увійти"
    });
  }

  next();
}

function weightedPick(items) {
  const total = items.reduce(
    (sum, item) => sum + item[2],
    0
  );

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
    .filter(([name, image]) => name && image);

  res.json(
    skins.map(([name, image]) => ({
      name,
      image
    }))
  );
});

app.get("/api/cases", (req, res) => {
  res.json(cases);
});
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
app.post(
  "/api/skin-deposit",
  auth,
  async (req, res) => {
    try {
const {
  skinName,
  value,
  assetid,
  tradeUrl
} = req.body;
      if (
        !skinName ||
        !Number.isFinite(Number(value))
      ) {
        return res.status(400).json({
          error: "Невірні дані"
        });
      }

     const image = req.body.image || null;
      
      const skinImage =
        image || skinImages[skinName] || null;
if (tradeUrl) {
  await pool.query(
    `
    UPDATE users
    SET trade_url = $1
    WHERE id = $2
    `,
    [tradeUrl, req.session.userId]
  );
}
      const result = await pool.query(
        `
        INSERT INTO skin_deposit_requests
  (
    user_id,
    skin_name,
    skin_image,
    value,
    assetid
  )
VALUES
  ($1, $2, $3, $4, $5)
        RETURNING
          id,
          skin_name,
          value,
          status,
          created_at
        `,
       [
  req.session.userId,
  skinName,
  skinImage,
  Number(value),
  assetid
]
   );
      res.json({
        ok: true,
        request: result.rows[0]
      });

    } catch (e) {

      console.error(
        "Skin deposit error:",
        e
      );

      res.status(500).json({
        error: "Не вдалося створити заявку"
      });
    }
  }
);
app.get("/api/cases", (req, res) => {
  res.json(cases);
});

app.post(
  "/api/open/:caseId",
  auth,
  async (req, res) => {

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

      if (
        Number(user.balance) <
        Number(caseData.price)
      ) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          error: "Недостатньо коштів"
        });
      }

      const item = weightedPick(
        caseData.items
      );

      await client.query(
        `
        UPDATE users
        SET balance = balance - $1
        WHERE id = $2
        `,
        [
          caseData.price,
          req.session.userId
        ]
      );

      await client.query(
        `
        INSERT INTO inventory
          (
            user_id,
            item_name,
            rarity,
            value
          )
        VALUES
          ($1, $2, $3, $4)
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
        VALUES
          ($1, $2, $3, $4, $5, $6)
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

      const balanceResult =
        await client.query(
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
          image:
            skinImages[item[0]] || null
        },
        balance:
          balanceResult.rows[0].balance
      });

    } catch (e) {

      await client.query("ROLLBACK");

      console.error(
        "Case opening error:",
        e
      );

      res.status(500).json({
        error: "Помилка сервера"
      });

    } finally {

      client.release();

    }
  }
);
app.get(
  "/api/inventory",
  auth,
  async (req, res) => {
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
        AND status = 'available'
        ORDER BY id DESC
        `,
        [req.session.userId]
      );

      res.json(result.rows);

    } catch (e) {

      console.error(
        "Inventory error:",
        e
      );

      res.status(500).json({
        error: "Помилка сервера"
      });
    }
  }
);


app.post(
  "/api/inventory/:id/sell",
  auth,
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      await client.query("BEGIN");

      const itemResult =
        await client.query(
          `
          SELECT *
          FROM inventory
          WHERE id = $1
            AND user_id = $2
          FOR UPDATE
          `,
          [
            req.params.id,
            req.session.userId
          ]
        );

      const item =
        itemResult.rows[0];

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
        [
          item.value,
          req.session.userId
        ]
      );

      await client.query(
        `
        DELETE FROM inventory
        WHERE id = $1
          AND user_id = $2
        `,
        [
          item.id,
          req.session.userId
        ]
      );

      const balanceResult =
        await client.query(
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
        balance:
          balanceResult.rows[0].balance
      });

    } catch (e) {

      await client.query("ROLLBACK");

      console.error(
        "Inventory sell error:",
        e
      );

      res.status(500).json({
        error: "Помилка сервера"
      });

    } finally {

      client.release();

    }
  }
);


app.post("/api/trade-url", auth, async (req, res) => {
  try {
    const tradeUrl = String(req.body.tradeUrl || "").trim();

    if (!tradeUrl || !tradeUrl.startsWith("https://steamcommunity.com/tradeoffer/new/?")) {
      return res.status(400).json({
        error: "Невірне Trade URL"
      });
    }

    const url = new URL(tradeUrl);

    if (url.searchParams.get("partner") === null) {
      return res.status(400).json({
        error: "У Trade URL немає partner"
      });
    }

    await pool.query(
      `UPDATE users SET trade_url = $1 WHERE id = $2`,
      [tradeUrl, req.session.userId]
    );

    res.json({
      ok: true
    });
  } catch (e) {
    console.error("Trade URL error:", e);
    res.status(400).json({
      error: "Невірне Trade URL"
    });
  }
});

app.post(
  "/api/withdraw/:inventoryId",
  auth,
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      await client.query("BEGIN");

      const inventoryResult =
        await client.query(
          `
          SELECT *
          FROM inventory
          WHERE id = $1
            AND user_id = $2
            AND status = 'available'
          FOR UPDATE
          `,
          [
            req.params.inventoryId,
            req.session.userId
          ]
        );

      const item =
        inventoryResult.rows[0];

      if (!item) {

        await client.query("ROLLBACK");

        return res.status(404).json({
          error: "Предмет не знайдено"
        });
      }

      const userResult =
        await client.query(
          `
          SELECT steam_id, trade_url
          FROM users
          WHERE id = $1
          `,
          [req.session.userId]
        );

      const user =
        userResult.rows[0];

      if (!user || !user.steam_id) {

        await client.query("ROLLBACK");

        return res.status(400).json({
          error:
            "Спочатку увійдіть через Steam"
        });
      }

      const withdrawal =
        await client.query(
          `
          INSERT INTO withdrawals
            (
              user_id,
              inventory_id,
              steam_id,
              item_name,
              value,
              trade_url
            )
          VALUES
            ($1, $2, $3, $4, $5, $6)
          RETURNING id
          `,
          [
            req.session.userId,
            item.id,
            user.steam_id,
            item.item_name,
            item.value,
            user.trade_url || null
          ]
        );

      await client.query("COMMIT");

      res.json({
        ok: true,
        withdrawalId:
          withdrawal.rows[0].id
      });

    } catch (e) {

      await client.query("ROLLBACK");

      console.error(
        "Withdrawal error:",
        e
      );

      res.status(500).json({
        error:
          "Помилка створення заявки"
      });

    } finally {

      client.release();

    }
  }
);
app.get("/auth/steam", (req, res) => {

  const returnUrl =
    "https://casezone.onrender.com/auth/steam/callback";

  const realm =
    "https://casezone.onrender.com/";

  const params = new URLSearchParams({
    "openid.ns":
      "http://specs.openid.net/auth/2.0",

    "openid.mode":
      "checkid_setup",

    "openid.return_to":
      returnUrl,

    "openid.realm":
      realm,

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


app.get(
  "/auth/steam/callback",
  async (req, res) => {

    try {

      const params =
        new URLSearchParams();

      for (
        const [key, value]
        of Object.entries(req.query)
      ) {
        if (typeof value === "string") {
          params.set(key, value);
        }
      }

      const claimedId =
        params.get("openid.claimed_id");

      const returnTo =
        params.get("openid.return_to");

      if (!claimedId) {
        return res
          .status(400)
          .send("SteamID не отримано");
      }

      if (
        returnTo !==
        "https://casezone.onrender.com/auth/steam/callback"
      ) {
        return res
          .status(400)
          .send("Невірний callback");
      }

      params.set(
        "openid.mode",
        "check_authentication"
      );

      const verifyResponse =
        await fetch(
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

      const verification =
        await verifyResponse.text();

      if (
        !verification.includes(
          "is_valid:true"
        )
      ) {
        return res
          .status(401)
          .send(
            "Steam не підтвердив авторизацію"
          );
      }

      const steamId =
        claimedId.split("/").pop();

      let result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE steam_id = $1
          `,
          [steamId]
        );

      let user =
        result.rows[0];

      if (!user) {

        const username =
          "Steam_" +
          steamId.slice(-8);

        const randomPassword =
          crypto
            .randomBytes(32)
            .toString("hex");

        const passwordHash =
          await bcrypt.hash(
            randomPassword,
            10
          );

        result =
          await pool.query(
            `
            INSERT INTO users
              (
                username,
                password_hash,
                steam_id
              )
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

        user =
          result.rows[0];
      }

      req.session.userId =
        user.id;

      res.redirect("/");

    } catch (e) {

      console.error(
        "Steam login error:",
        e
      );

      res
        .status(500)
        .send(
          "Помилка входу через Steam"
        );
    }
  }
);


/* =========================
   LIQPAY
========================= */

app.post(
  "/api/liqpay/create",
  auth,
  async (req, res) => {

    try {

      const amount =
        Number(req.body.amount);

      const allowedAmounts = [
        100,
        250,
        500,
        1000,
        2500
      ];

      if (
        !allowedAmounts.includes(amount)
      ) {
        return res.status(400).json({
          error: "Невірна сума"
        });
      }

      if (
        !process.env.LIQPAY_PUBLIC_KEY ||
        !process.env.LIQPAY_PRIVATE_KEY
      ) {
        return res.status(500).json({
          error:
            "LiqPay не налаштований"
        });
      }

      const paymentResult =
        await pool.query(
          `
          INSERT INTO payments
            (
              user_id,
              amount,
              provider,
              status
            )
          VALUES
            (
              $1,
              $2,
              'liqpay',
              'pending'
            )
          RETURNING id
          `,
          [
            req.session.userId,
            amount
          ]
        );

      const paymentId =
        paymentResult.rows[0].id;

      const orderId =
        `casezone_${paymentId}`;

      const params = {
        version: 7,

        public_key:
          process.env.LIQPAY_PUBLIC_KEY,

        action: "pay",

        amount:
          amount.toFixed(2),

        currency: "UAH",

        description:
          `Поповнення CaseZone на ${amount} грн`,

        order_id:
          orderId,

        server_url:
          "https://casezone.onrender.com/api/liqpay/callback",

        result_url:
          "https://casezone.onrender.com/"
      };

      if (
        process.env.LIQPAY_PUBLIC_KEY
          .startsWith("sandbox_")
      ) {
        params.sandbox = 1;
      }

      const data =
        Buffer
          .from(
            JSON.stringify(params)
          )
          .toString("base64");

      const signature =
        crypto
          .createHash("sha3-256")
          .update(
            process.env.LIQPAY_PRIVATE_KEY +
            data +
            process.env.LIQPAY_PRIVATE_KEY
          )
          .digest("base64");

      res.json({
        ok: true,
        paymentId,
        orderId,
        data,
        signature,
        checkoutUrl:
          "https://www.liqpay.ua/api/3/checkout"
      });

    } catch (e) {

      console.error(
        "LiqPay create error:",
        e
      );

      res.status(500).json({
        error:
          "Не вдалося створити платіж"
      });
    }
  }
);


app.post(
  "/api/liqpay/callback",
  async (req, res) => {

    try {

      const {
        data,
        signature
         } = req.body;

      if (!data || !signature) {
        return res
          .status(400)
          .send("Missing data");
      }

      const expectedSignature =
        crypto
          .createHash("sha3-256")
          .update(
            process.env.LIQPAY_PRIVATE_KEY +
            data +
            process.env.LIQPAY_PRIVATE_KEY
          )
          .digest("base64");

      if (
        signature !==
        expectedSignature
      ) {
        return res
          .status(403)
          .send("Invalid signature");
      }

      const payment =
        JSON.parse(
          Buffer
            .from(
              data,
              "base64"
            )
            .toString("utf8")
        );

      const orderId =
        payment.order_id;

      if (
        !orderId ||
        !orderId.startsWith(
          "casezone_"
        )
      ) {
        return res
          .status(400)
          .send("Invalid order");
      }

      const paymentId =
        Number(
          orderId.replace(
            "casezone_",
            ""
          )
        );

      if (
        !Number.isInteger(paymentId)
      ) {
        return res
          .status(400)
          .send(
            "Invalid payment ID"
          );
      }

      const paymentResult =
        await pool.query(
          `
          SELECT *
          FROM payments
          WHERE id = $1
          `,
          [paymentId]
        );

      const dbPayment =
        paymentResult.rows[0];

      if (!dbPayment) {
        return res
          .status(404)
          .send("Payment not found");
      }

      if (
        dbPayment.status ===
        "success"
      ) {
        return res.send("OK");
      }

      if (
        Number(payment.amount) !==
        Number(dbPayment.amount)
      ) {

        await pool.query(
          `
          UPDATE payments
          SET status = 'error'
          WHERE id = $1
          `,
          [paymentId]
        );

        return res
          .status(400)
          .send("Amount mismatch");
      }

      const isSandbox =
        process.env
          .LIQPAY_PUBLIC_KEY
          ?.startsWith(
            "sandbox_"
          );

      const successful =
        payment.status === "success" ||
        (
          isSandbox &&
          payment.status === "sandbox"
        );

      if (!successful) {

        await pool.query(
          `
          UPDATE payments
          SET
            status = $1,
            transaction_id = $2
          WHERE id = $3
          `,
          [
            payment.status ||
              "failed",

            payment.transaction_id
              ? String(
                  payment.transaction_id
                )
              : null,

            paymentId
          ]
        );

        return res.send("OK");
      }

      const client =
        await pool.connect();

      try {

        await client.query(
          "BEGIN"
        );

        const lockedPayment =
          await client.query(
            `
            SELECT *
            FROM payments
            WHERE id = $1
            FOR UPDATE
            `,
            [paymentId]
          );

        const currentPayment =
          lockedPayment.rows[0];

        if (
          !currentPayment ||
          currentPayment.status ===
            "success"
        ) {
          await client.query(
            "ROLLBACK"
          );

          return res.send("OK");
        }

        await client.query(
          `
          UPDATE users
          SET balance =
            balance + $1
          WHERE id = $2
          `,
          [
            currentPayment.amount,
            currentPayment.user_id
          ]
        );

        await client.query(
          `
          UPDATE payments
          SET
            status = 'success',
            transaction_id = $1
          WHERE id = $2
          `,
          [
            payment.transaction_id
              ? String(
                  payment.transaction_id
                )
              : String(
                  payment.payment_id ||
                  orderId
                ),

            paymentId
          ]
        );

        await client.query(
          "COMMIT"
        );

        console.log(
          `LiqPay: +${currentPayment.amount} грн, user ${currentPayment.user_id}`
        );

        return res.send("OK");

      } catch (e) {

        await client.query(
          "ROLLBACK"
        );

        throw e;

      } finally {

        client.release();

      }

    } catch (e) {

      console.error(
        "LiqPay callback error:",
        e
      );

      res
        .status(500)
        .send("Server error");
    }
  }
);
/* =========================
   ГОЛОВНА / АДМІНКА
========================= */

app.get("/", (req, res) => {
  res.sendFile(
    path.join(__dirname, "index.html")
  );
});


app.get(
  "/admin",
  auth,
  async (req, res) => {

    try {

      const userResult =
        await pool.query(
          `
          SELECT steam_id
          FROM users
          WHERE id = $1
          `,
          [req.session.userId]
        );

      const user =
        userResult.rows[0];

      if (
        !user ||
        user.steam_id !==
          "76561199848778920"
      ) {
        return res
          .status(403)
          .send("Доступ заборонено");
      }

      res.sendFile(
        path.join(
          __dirname,
          "admin.html"
        )
      );

    } catch (e) {

      console.error(
        "Admin page error:",
        e
      );

      res
        .status(500)
        .send("Помилка сервера");
    }
  }
);


/* =========================
   ADMIN: СПИСОК ЗАЯВОК
========================= */

app.get(
  "/api/admin/skin-deposits",
  auth,
  async (req, res) => {

    try {

      const userResult =
        await pool.query(
          `
          SELECT steam_id
          FROM users
          WHERE id = $1
          `,
          [req.session.userId]
        );

      const user =
        userResult.rows[0];

      if (
        !user ||
        user.steam_id !==
          "76561199848778920"
      ) {
        return res
          .status(403)
          .json({
            error: "Доступ заборонено"
          });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            user_id,
            skin_name,
            skin_image,
            value,
            status,
            created_at
          FROM skin_deposit_requests
          ORDER BY created_at DESC
          `
        );

      res.json({
        ok: true,
        requests:
          result.rows
      });

    } catch (e) {

      console.error(
        "Admin skin deposits error:",
        e
      );

      res
        .status(500)
        .json({
          error: "Помилка сервера"
        });
    }
  }
);


/* =========================
   ADMIN: ОБРОБКА ЗАЯВКИ
========================= */

app.post(
  "/api/admin/skin-deposits/:id/status",
  auth,
  async (req, res) => {

    const client =
      await pool.connect();

    try {

      const userResult =
        await client.query(
          `
          SELECT steam_id
          FROM users
          WHERE id = $1
          `,
          [req.session.userId]
        );

      const admin =
        userResult.rows[0];

      if (
        !admin ||
        admin.steam_id !==
          "76561199848778920"
      ) {
        return res
          .status(403)
          .json({
            error: "Доступ заборонено"
          });
      }

      const { status } =
        req.body;

      if (
        status !== "approved" &&
        status !== "rejected"
      ) {
        return res
          .status(400)
          .json({
            error: "Невірний статус"
          });
      }

      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id)
      ) {
        return res
          .status(400)
          .json({
            error: "Невірний ID"
          });
      }

      await client.query(
        "BEGIN"
      );

      const requestResult =
        await client.query(
          `
          SELECT *
          FROM skin_deposit_requests
          WHERE id = $1
          FOR UPDATE
          `,
          [id]
        );

      if (
        !requestResult.rows.length
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res
          .status(404)
          .json({
            error:
              "Заявку не знайдено"
          });
      }

      const request =
        requestResult.rows[0];

      if (
        request.status !==
        "pending"
      ) {

        await client.query(
          "ROLLBACK"
        );

        return res
          .status(400)
          .json({
            error:
              "Ця заявка вже була оброблена"
          });
      }


      /*
        ПРИЙМАЄМО ЗАЯВКУ
      */

      if (
        status === "approved"
      ) {

        // 1. Зараховуємо
        // гроші користувачу
        await client.query(
          `
          UPDATE users
          SET balance =
            balance + $1
          WHERE id = $2
          `,
          [
            Number(request.value),
            request.user_id
          ]
        );
        await client.query(
  `
INSERT INTO site_inventory (
  item_name,
  image,
  value,
  source_user_id,
  deposit_request_id,
  assetid,
  status
)
  VALUES (
    $1,
    $2,
    $3,
    $4,
    $5,
    $6,
    'available'
  )
  `,
  [
    request.skin_name,
    request.skin_image,
    Number(request.value),
    request.user_id,
    request.id,
    request.assetid
  ]
);


        // 2. Передаємо
        // скін сайту

      }


      /*
        ЗМІНЮЄМО СТАТУС
      */

      const updateResult =
        await client.query(
          `
          UPDATE skin_deposit_requests
          SET status = $1
          WHERE id = $2
          RETURNING *
          `,
          [
            status,
            id
          ]
        );


      await client.query(
        "COMMIT"
      );


      res.json({
        ok: true,
        request:
          updateResult.rows[0]
      });

    } catch (e) {

      await client.query(
        "ROLLBACK"
      );

      console.error(
        "Admin skin deposit status error:",
        e
      );

      res
        .status(500)
        .json({
          error:
            "Помилка сервера"
        });

    } finally {

      client.release();

    }
  }
);
/* =========================
   API: ПОТОЧНИЙ КОРИСТУВАЧ
========================= */

app.get(
  "/api/me",
  auth,
  async (req, res) => {
    try {

      const result =
        await pool.query(
          `
          SELECT
            id,
            username,
            steam_id,
            balance,
            trade_url,
              const result =
        await pool.query(
          `
    );
          FROM users
          WHERE id = $1
          `,
          [req.session.userId]
        );

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Користувача не знайдено"
        });
      }

      res.json({
        ok: true,
        user: result.rows[0]
      });

    } catch (e) {

      console.error(
        "Current user error:",
             e
      );

      res.status(500).json({
        error: "Помилка сервера"
      });
    }
  }
);


/* =========================
   API: ВИХІД
========================= */

app.post(
  "/api/logout",
  (req, res) => {

    req.session.destroy(() => {
      res.json({
        ok: true
      });
    });
  }
);


app.get(
  "/api/site-inventory",
  auth,
  async (req, res) => {
    try {

      const userResult =
        await pool.query(
          `
          SELECT steam_id
          FROM users
          WHERE id = $1
          `,
          [req.session.userId]
        );

      const user =
        userResult.rows[0];

      // Тільки адміністратор
      if (
        !user ||
        user.steam_id !== "76561199848778920"
      ) {
        return res.status(403).json({
          error: "Доступ заборонено"
        });
      }

      const result =
        await pool.query(
          `
          SELECT
            id,
            item_name,
            image,
            value,
            status,
            created_at
          FROM site_inventory
          WHERE status = 'available'
          ORDER BY created_at DESC
          `
        );

      res.json({
        ok: true,
        items: result.rows
      });

    } catch (e) {

      console.error(
        "Site inventory error:",
        e
      );

      res.status(500).json({
        error: "Помилка сервера"
      });
    }
  }
);

/* =========================
   STEAM: ІНВЕНТАР КОРИСТУВАЧА
========================= */

app.get(
  "/api/my-steam-inventory",
  auth,
  async (req, res) => {
    try {

      const userResult =
        await pool.query(
          `
          SELECT steam_id
          FROM users
          WHERE id = $1
          `,
          [req.session.userId]
        );

      const user =
        userResult.rows[0];

      if (!user || !user.steam_id) {
        return res.status(400).json({
          error:
            "Steam-акаунт не підключений"
        });
      }

      /*
        =========================
        КЕШ ІНВЕНТАРЮ
        =========================
      */

      const cacheResult =
        await pool.query(
          `
          SELECT inventory, updated_at
          FROM steam_inventory_cache
          WHERE steam_id = $1
          `,
          [user.steam_id]
        );

      const cached =
        cacheResult.rows[0];

      if (cached) {

        const cacheAge =
          Date.now() -
          new Date(
            cached.updated_at
          ).getTime();

        const CACHE_TIME =
          5 * 60 * 1000;

        if (cacheAge < CACHE_TIME) {

          console.log(
            "STEAM INVENTORY: використано кеш"
          );

          return res.json({
            ok: true,
            items: cached.inventory,
            cached: true
          });
        }
      }

      /*
        =========================
        STEAMWEBAPI
        =========================
      */

      const apiKey =
        process.env.STEAMWEBAPI_KEY;

      if (!apiKey) {
        return res.status(500).json({
          error:
            "STEAMWEBAPI_KEY не налаштований"
        });
      }

      const apiUrl =
        new URL(
          "https://www.steamwebapi.com/steam/api/inventory"
        );

      apiUrl.searchParams.set(
        "steam_id",
        user.steam_id
      );

      apiUrl.searchParams.set(
        "game",
        "cs2"
      );

      apiUrl.searchParams.set(
        "key",
        apiKey
      );

      apiUrl.searchParams.set(
        "currency",
        "UAH"
      );

      const response =
        await fetch(apiUrl);

      console.log(
        "STEAMWEBAPI STATUS:",
        response.status
      );

      if (!response.ok) {

        const errorText =
          await response.text();

        console.error(
          "STEAMWEBAPI ERROR:",
          errorText
        );

        return res.status(
          response.status
        ).json({
          error:
            `SteamWebAPI повернув помилку ${response.status}`
        });
      }

      const data =
        await response.json();

      /*
        =========================
        ОБРОБКА ІНВЕНТАРЮ
        =========================
      */

      const rawItems =
        Array.isArray(data)
          ? data
          : Array.isArray(data.items)
            ? data.items
            : Array.isArray(data.inventory)
              ? data.inventory
              : [];

      const inventory =
        rawItems
          .map(item => ({

            assetid:
              item.assetid || "",

            classid:
              item.classid || "",

            instanceid:
              item.instanceid || "",

            name:
              item.marketname ||
              item.markethashname ||
              item.name ||
              "Unknown skin",

            image:
              item.image ||
              "",

            price:
              Number(
                item.pricereal ??
                item.pricelatest ??
                item.price ??
                0
              ),

            tradable:
              item.tradable !== false

          }))
          .filter(
            item => item.assetid
          );

      console.log(
        "STEAM INVENTORY ITEMS:",
        inventory.length
      );

      /*
        =========================
        ЗБЕРІГАЄМО В КЕШ
        =========================
      */

      await pool.query(
        `
        INSERT INTO steam_inventory_cache
          (
            steam_id,
            inventory,
            updated_at
          )
        VALUES
          ($1, $2, NOW())

        ON CONFLICT (steam_id)
        DO UPDATE SET
          inventory = EXCLUDED.inventory,
          updated_at = NOW()
        `,
        [
          user.steam_id,
          JSON.stringify(inventory)
        ]
      );

      /*
        =========================
        ВІДПОВІДЬ
        =========================
      */

      res.json({
        ok: true,
        items: inventory,
        cached: false
      });

    } catch (e) {

      console.error(
        "Steam inventory error:",
        e
      );

      res.status(500).json({
        error:
          "Помилка отримання Steam-інвентарю"
      });
    }
  }
);
/* =========================
   ЗАПУСК
========================= */

const PORT =
  process.env.PORT || 3000;

async function start() {

  try {

    await initDatabase();

    await loadSkinImages();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `CaseZone запущений на порту ${PORT}`
        );
      }
    );

  } catch (e) {

    console.error(
      "Помилка запуску:",
      e
    );

    process.exit(1);
  }
}

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

    if (
      !user ||
      user.steam_id !== "76561199848778920"
    ) {
      return res.status(403).json({
        error: "Доступ заборонено"
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        steam_id,
        item_name,
        value,
        status,
        trade_offer_id,
        created_at
      FROM withdrawals
      ORDER BY id DESC
      `
    );

    res.json(result.rows);

  } catch (e) {
    console.error("Withdrawals error:", e);

    res.status(500).json({
      error: "Помилка отримання заявок"
    });
  }
});
app.post("/api/withdrawals/:id/status", auth, async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const adminResult = await client.query(
      `
      SELECT steam_id
      FROM users
      WHERE id = $1
      `,
      [req.session.userId]
    );

    const admin = adminResult.rows[0];

    if (!admin || admin.steam_id !== "76561199848778920") {
      await client.query("ROLLBACK");
      return res.status(403).json({
        error: "Доступ заборонено"
      });
    }

    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Невірний статус"
      });
    }

    const withdrawalResult = await client.query(
      `
      SELECT
        w.id,
        w.inventory_id,
        w.user_id,
        w.steam_id,
        w.item_name,
        w.value,
        w.status,
        w.trade_url,
        w.trade_offer_id,
        i.status AS inventory_status
      FROM withdrawals w
      JOIN inventory i ON i.id = w.inventory_id
      WHERE w.id = $1
      FOR UPDATE OF w, i
      `,
      [req.params.id]
    );

    const withdrawal = withdrawalResult.rows[0];

    if (!withdrawal) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        error: "Заявка не знайдена"
      });
    }

    if (withdrawal.status !== "pending") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Заявка вже оброблена"
      });
    }

    if (status === "rejected") {
      const result = await client.query(
        `
        UPDATE withdrawals
        SET status = 'rejected'
        WHERE id = $1 AND status = 'pending'
        RETURNING id, status
        `,
        [req.params.id]
      );

      await client.query("COMMIT");

      return res.json({
        ok: true,
        withdrawal: result.rows[0]
      });
    }

    if (withdrawal.inventory_status !== "available") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Цей предмет вже недоступний для виводу"
      });
    }

    const tradeUrl = withdrawal.trade_url;

    if (!tradeUrl) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "У користувача не збережено Steam Trade URL"
      });
    }

    let partner;

    try {
      const parsed = new URL(tradeUrl);
      partner = tradeUrl;

      if (
        parsed.origin !== "https://steamcommunity.com" ||
        parsed.pathname !== "/tradeoffer/new/" ||
        !parsed.searchParams.get("partner")
      ) {
        throw new Error("invalid trade url");
      }
    } catch {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error: "Невірне Steam Trade URL користувача"
      });
    }

    // Отримуємо актуальний інвентар бота.
    const botItems = await new Promise((resolve, reject) => {
      tradeManager.getInventoryContents(
        730,
        2,
        true,
        (err, inventory) => {
          if (err) return reject(err);
          resolve(inventory || []);
        }
      );
    });

    const wantedName = String(withdrawal.item_name || "").trim();

    const botItem = botItems.find(item => {
      const names = [
        item.market_hash_name,
        item.marketHashName,
        item.market_name,
        item.name
      ]
        .filter(Boolean)
        .map(String);

      return (
        item.tradable !== false &&
        names.some(name => name === wantedName)
      );
    });

    if (!botItem) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        error:
          `Скін "${wantedName}" не знайдений у Steam-інвентарі бота`
      });
    }

    const offer = tradeManager.createOffer(partner);

    offer.addMyItem({
      appid: 730,
      contextid: "2",
      assetid: String(botItem.assetid)
    });

    const tradeOfferId = await new Promise((resolve, reject) => {
      offer.send((err, status) => {
        if (err) return reject(err);
        resolve(offer.id || status || null);
      });
    });

    if (!tradeOfferId) {
      await client.query("ROLLBACK");
      return res.status(500).json({
        error: "Steam не повернув ID Trade Offer"
      });
    }

    await client.query(
      `
      UPDATE inventory
      SET status = 'withdrawn'
      WHERE id = $1 AND status = 'available'
      `,
      [withdrawal.inventory_id]
    );

    const result = await client.query(
      `
      UPDATE withdrawals
      SET
        status = 'approved',
        trade_offer_id = $1
      WHERE id = $2 AND status = 'pending'
      RETURNING id, status, trade_offer_id
      `,
      [String(tradeOfferId), req.params.id]
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Заявка вже була оброблена"
      });
    }

    await client.query("COMMIT");

    res.json({
      ok: true,
      withdrawal: result.rows[0],
      tradeOfferId: String(tradeOfferId)
    });
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    console.error(
      "Withdrawal trade error:",
      e
    );

    res.status(500).json({
      error:
        e?.message || "Помилка створення Steam Trade Offer"
    });
  } finally {
    client.release();
  }
});

start();
