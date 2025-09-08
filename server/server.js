import express from "express";
import Database from "better-sqlite3";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import fs from "fs";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = process.env.PORT || 8000;
const SQLiteStore = connectSqlite3(session);

// --- Static uploads (kategoribilder) ---
const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const CATEGORY_UPLOAD_DIR = path.join(UPLOAD_ROOT, "categories");
fs.mkdirSync(CATEGORY_UPLOAD_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOAD_ROOT));

// Multer (lagra filer i uploads/categories)
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CATEGORY_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = Date.now() + "-" + Math.random().toString(16).slice(2) + ext;
    cb(null, safe);
  },
});
const upload = multer({ storage });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// se till att dina uppladdade filer hamnar här: <repo>/server/uploads/...
const uploadsDir = path.join(__dirname, "uploads");

app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders(res, filePath) {
      if (filePath.endsWith(".avif")) res.setHeader("Content-Type", "image/avif");
      else if (filePath.endsWith(".webp")) res.setHeader("Content-Type", "image/webp");
      else if (filePath.endsWith(".svg")) res.setHeader("Content-Type", "image/svg+xml");
    },
  })
);

// (tillfällig loggning – hjälper felsökning)
app.use("/uploads", (req, _res, next) => {
  console.log("Static /uploads hit:", req.path);
  next();
});

// --- Middleware ---
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
app.use(
  session({
    store: new SQLiteStore({ db: "sessions.db", dir: "./db" }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dagar
    },
  })
);

// Serva alla filer under ./uploads på /uploads
app.use(
  "/uploads",
  express.static(uploadsDir, {
    setHeaders(res, filePath) {
      // Sätt korrekta content-types för moderna bildformat
      if (filePath.endsWith(".avif")) {
        res.setHeader("Content-Type", "image/avif");
      } else if (filePath.endsWith(".webp")) {
        res.setHeader("Content-Type", "image/webp");
      } else if (filePath.endsWith(".svg")) {
        res.setHeader("Content-Type", "image/svg+xml");
      }
    },
  })
);

// --- DB init ---
const db = new Database("./db/app.db", { verbose: console.log });
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// --- Helpers (hash) ---
const hashPassword = async (password) => await bcrypt.hash(password, 10);
const comparePassword = async (password, hash) => await bcrypt.compare(password, hash);

// Kolla om en sträng "ser ut som" en bcrypt-hash (för att migrera klartext)
function isBcryptHash(s) {
  return typeof s === "string" && /^\$2[aby]\$\d{2}\$/.test(s);
}

// --- Schema (CREATE IF NOT EXISTS) ---
db.prepare(
  `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','admin')) DEFAULT 'customer'
);`
).run();

// Fri categories-tabell (namn + frivillig bild)
db.prepare(
  `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoryName TEXT UNIQUE NOT NULL,
  image_url TEXT
);`
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  productName TEXT NOT NULL,
  price REAL NOT NULL,
  image TEXT,
  secondaryImage1 TEXT,
  secondaryImage2 TEXT,
  secondaryImage3 TEXT,
  brand TEXT,
  productDescription TEXT,
  isTrending TEXT,
  categoryId INTEGER NOT NULL,
  publishingDate TEXT NOT NULL,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE RESTRICT
);`
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS hero_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL
);`
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);`
).run();

//
// NOTE: We will (re)build "orders" below if snapshot columns are missing.
// This initial create is only for fresh DBs.
//
db.prepare(
  `
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,                            -- nullable (guest orders = NULL)
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  payment_method TEXT,
  -- buyer snapshot fields (nullable)
  buyer_firstName   TEXT,
  buyer_lastName    TEXT,
  buyer_email       TEXT,
  buyer_mobilePhone TEXT,
  buyer_address     TEXT,
  buyer_city        TEXT,
  buyer_postalCode  TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase REAL NOT NULL,
  product_name TEXT,
  unit_price REAL,
  line_total REAL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);`
).run();

// Säkerställ unik index för upserts
db.prepare(
  `
CREATE UNIQUE INDEX IF NOT EXISTS ux_order_items_order_product
  ON order_items(order_id, product_id);
`
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,                     -- 1–1 mot users
  firstName   TEXT,
  lastName    TEXT,
  email       TEXT,
  mobilePhone TEXT,
  address     TEXT,
  city        TEXT,
  postalCode  TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`
).run();

db.prepare(
  `
CREATE TRIGGER IF NOT EXISTS trg_user_profiles_updated_at
AFTER UPDATE ON user_profiles
FOR EACH ROW
BEGIN
  UPDATE user_profiles SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;
`
).run();

// (Valfritt) Seed-admin via env-variabler
if (process.env.SEED_ADMIN_USER && process.env.SEED_ADMIN_PASS) {
  const u = process.env.SEED_ADMIN_USER.trim();
  const p = process.env.SEED_ADMIN_PASS;
  if (u && p) {
    const exists = db.prepare("SELECT id FROM users WHERE username=?").get(u);
    if (!exists) {
      const hashed = bcrypt.hashSync(p, 10);
      db.prepare("INSERT INTO users (username, password, role) VALUES (?,?, 'admin')").run(u, hashed);
      console.log(`Seeded admin user "${u}"`);
    }
  }
}

// --- Migration helpers ---
function columnExists(table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === col);
}

// Rebuild "orders" table if snapshot columns are missing OR user_id was NOT NULL
(function migrateOrdersTableIfNeeded() {
  const hasBuyer = columnExists("orders", "buyer_firstName");
  if (hasBuyer) {
    // still ensure indexes
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);`
    ).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON orders(user_id, status);`
    ).run();
    return;
  }

  console.log("Migrating orders table to add buyer snapshot columns & allow NULL user_id...");

  // Temporarily disable FKs to allow table rebuild
  db.pragma("foreign_keys = OFF");
  try {
    db.prepare(
      `
      CREATE TABLE IF NOT EXISTS orders_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,                            -- now nullable
        status TEXT NOT NULL DEFAULT 'created',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        payment_method TEXT,
        buyer_firstName   TEXT,
        buyer_lastName    TEXT,
        buyer_email       TEXT,
        buyer_mobilePhone TEXT,
        buyer_address     TEXT,
        buyer_city        TEXT,
        buyer_postalCode  TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      `
    ).run();

    // Copy existing data (columns that exist)
    const hasPayment = columnExists("orders", "payment_method");
    const colsOld = hasPayment
      ? "id, user_id, status, created_at, payment_method"
      : "id, user_id, status, created_at, NULL AS payment_method";

    db.prepare(
      `
      INSERT INTO orders_new (id, user_id, status, created_at, payment_method)
      SELECT ${colsOld} FROM orders;
      `
    ).run();

    db.prepare(`DROP TABLE orders;`).run();
    db.prepare(`ALTER TABLE orders_new RENAME TO orders;`).run();

    // Indexes
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);`
    ).run();
    db.prepare(
      `CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON orders(user_id, status);`
    ).run();

    console.log("Orders table migration done.");
  } finally {
    db.pragma("foreign_keys = ON");
  }
})();

// --- Migration for order_items new columns (idempotent) ---
try {
  if (!columnExists("order_items", "product_name")) {
    db.prepare(`ALTER TABLE order_items ADD COLUMN product_name TEXT`).run();
  }
  if (!columnExists("order_items", "unit_price")) {
    db.prepare(`ALTER TABLE order_items ADD COLUMN unit_price REAL`).run();
  }
  if (!columnExists("order_items", "line_total")) {
    db.prepare(`ALTER TABLE order_items ADD COLUMN line_total REAL`).run();
  }
  db.prepare(
    `
    CREATE UNIQUE INDEX IF NOT EXISTS ux_order_items_order_product
    ON order_items(order_id, product_id);
  `
  ).run();

  db.prepare(
    `
    UPDATE order_items AS oi
    SET
      unit_price = COALESCE(unit_price, price_at_purchase),
      product_name = COALESCE(product_name, (SELECT p.productName FROM products p WHERE p.id = oi.product_id)),
      line_total = COALESCE(line_total, COALESCE(unit_price, price_at_purchase) * quantity)
  `
  ).run();
} catch (e) {
  console.error("order_items migration failed:", e);
}

// --- Migration: categories – drop CHECK & use AUTOINCREMENT if needed ---
(function migrateCategoriesIfNeeded() {
  const row = db
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='categories'")
    .get();
  const sql = row?.sql || "";
  const hasCheck = /CHECK\s*\(/i.test(sql);
  const hasAuto = /AUTOINCREMENT/i.test(sql);

  if (!hasCheck && hasAuto) {
    // already good
  } else {
    console.log("Migrating categories table -> drop CHECK, use AUTOINCREMENT...");

    db.pragma("foreign_keys = OFF");
    try {
      db.prepare(`
        CREATE TABLE IF NOT EXISTS categories_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          categoryName TEXT UNIQUE NOT NULL
        );
      `).run();

      // Copy existing rows (keep ids)
      db.prepare(`
        INSERT OR IGNORE INTO categories_new (id, categoryName)
        SELECT id, categoryName FROM categories;
      `).run();

      db.prepare(`DROP TABLE categories;`).run();
      db.prepare(`ALTER TABLE categories_new RENAME TO categories;`).run();
    } finally {
      db.pragma("foreign_keys = ON");
    }
  }

  // ADD image_url column if missing
  try {
    if (!columnExists("categories", "image_url")) {
      db.prepare(`ALTER TABLE categories ADD COLUMN image_url TEXT`).run();
    }
  } catch (e) {
    console.error("categories add image_url failed:", e);
  }
})();

// --- Engångs-seed av kategorier ---
const catCount = db.prepare(`SELECT COUNT(*) as c FROM categories;`).get().c;
if (catCount === 0) {
  const seed = db.prepare(`INSERT INTO categories (categoryName) VALUES (?)`);
  const cats = ["Shoes", "Clothes", "Bags", "Watches", "Sunglasses"];
  const tx = db.transaction((rows) => rows.forEach((name) => seed.run(name)));
  tx(cats);
}

// --- Auth guards ---
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized" });
  }
  next();
}

// --- Helpers (favorites & cart) ---
function ensureGuestFavorites(req) {
  if (!Array.isArray(req.session.guestFavorites))
    req.session.guestFavorites = [];
}
function ensureGuestCart(req) {
  if (!Array.isArray(req.session.guestCart)) req.session.guestCart = [];
}
function getOrCreateCartOrderId(userId) {
  const row = db
    .prepare("SELECT id FROM orders WHERE user_id=? AND status='cart'")
    .get(userId);
  if (row) return row.id;
  const result = db
    .prepare("INSERT INTO orders (user_id, status) VALUES (?, 'cart')")
    .run(userId);
  return result.lastInsertRowid;
}

// Skapa/garanterad fallback-kategori (Uncategorized)
function ensureDefaultCategory() {
  const row = db
    .prepare("SELECT id FROM categories WHERE categoryName = 'Uncategorized'")
    .get();
  if (row) return row.id;
  const ins = db
    .prepare("INSERT INTO categories (categoryName, image_url) VALUES (?, NULL)")
    .run("Uncategorized");
  return ins.lastInsertRowid;
}

// --- Auth endpoints ---
app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Username and password is required" });
  const finalRole = role === "admin" ? "admin" : "customer";
  try {
    const hashed = await hashPassword(password);
    const stmt = db.prepare(
      "INSERT INTO users (username, password, role) VALUES (?,?,?)"
    );
    const result = stmt.run(username, hashed, finalRole);
    res
      .status(201)
      .json({ id: result.lastInsertRowid, username, role: finalRole });
  } catch (e) {
    res.status(409).json({
      error: "This username is already taken. Please try another one",
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = db
    .prepare("SELECT * FROM users WHERE username = ?")
    .get(username);
  if (!user)
    return res.status(401).json({ error: "Wrong username or password" });

  // === Auto-migrera från klartext till bcrypt vid första lyckade login ===
  let ok = false;
  if (isBcryptHash(user.password)) {
    ok = await comparePassword(password, user.password);
  } else {
    // Legacy: lösen lagrat i klartext
    ok = password === user.password;
    if (ok) {
      const newHash = await hashPassword(password);
      db.prepare("UPDATE users SET password=? WHERE id=?").run(
        newHash,
        user.id
      );
      console.log(
        `Upgraded plaintext password -> bcrypt for user ${user.username}`
      );
    }
  }

  if (!ok) return res.status(401).json({ error: "Wrong username or password" });

  const guestFavs = Array.isArray(req.session.guestFavorites)
    ? [...req.session.guestFavorites]
    : [];
  const guestCart = Array.isArray(req.session.guestCart)
    ? [...req.session.guestCart]
    : [];

  req.session.regenerate((err) => {
    if (err)
      return res.status(500).json({ error: "Session error during login" });

    req.session.user = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    // Migrera gäst-favoriter
    if (guestFavs.length > 0) {
      const insertFav = db.prepare(
        "INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)"
      );
      const tx = db.transaction((uid, pids) => {
        for (const pid of pids) insertFav.run(uid, pid);
      });
      tx(user.id, guestFavs);
    }
    req.session.guestFavorites = [];

    // Migrera gäst-cart → DB-cart (summera quantities)
    if (guestCart.length > 0) {
      const orderId = getOrCreateCartOrderId(req.session.user.id);
      const getProd = db.prepare(
        "SELECT id, productName, price FROM products WHERE id=?"
      );
      const upsertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, unit_price, product_name, line_total)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(order_id, product_id) DO UPDATE SET
          quantity = order_items.quantity + excluded.quantity,
          unit_price = excluded.unit_price,
          price_at_purchase = excluded.unit_price,
          product_name = excluded.product_name,
          line_total = (order_items.quantity + excluded.quantity) * excluded.unit_price
      `);
      const tx = db.transaction((orderId, items) => {
        for (const it of items) {
          const p = getProd.get(it.productId);
          if (!p) continue;
          upsertItem.run(
            orderId,
            p.id,
            it.quantity,
            p.price,
            p.price,
            p.productName,
            p.price * it.quantity
          );
        }
      });
      tx(orderId, guestCart);
      req.session.guestCart = [];
    }

    res.json({ message: "Logged in", user: req.session.user });
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err)
      return res.status(500).json({ error: "Error: Could not sign out" });
    res.clearCookie("connect.sid", { path: "/", sameSite: "lax" });
    res.json({ message: "Signed out" });
  });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// --- Admin/users ---
app.get("/api/admin/users", requireAdmin, (req, res) => {
  const rows = db
    .prepare("SELECT id, username, role FROM users ORDER BY id")
    .all();
  res.json(rows);
});

// ---------- Categories (ADMIN) ----------

// Lista kategorier (med produktcount + bild)
app.get("/api/categories", requireAdmin, (req, res) => {
  const rows = db.prepare(
    `
    SELECT
      c.id,
      c.categoryName,
      c.image_url AS imageUrl,
      COALESCE(cnt.c, 0) AS productCount
    FROM categories c
    LEFT JOIN (
      SELECT categoryId, COUNT(*) AS c
      FROM products
      GROUP BY categoryId
    ) cnt ON cnt.categoryId = c.id
    ORDER BY c.id ASC
  `
  ).all();
  res.json(rows);
});

// Skapa kategori (med ev. bild)
app.post("/api/categories", requireAdmin, upload.single("image"), (req, res) => {
  const name = String(req.body?.categoryName || "").trim();
  if (!name) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "categoryName required" });
  }

  const imageUrl = req.file ? `/uploads/categories/${req.file.filename}` : null;
  try {
    const r = db.prepare("INSERT INTO categories (categoryName, image_url) VALUES (?,?)")
      .run(name, imageUrl);
    res.status(201).json({
      id: r.lastInsertRowid,
      categoryName: name,
      imageUrl,
      productCount: 0,
    });
  } catch (e) {
    if (req.file) fs.unlink(req.file.path, () => {});
    if (String(e).includes("UNIQUE")) {
      return res.status(409).json({ error: "Category already exists" });
    }
    res.status(400).json({ error: "Could not create category" });
  }
});

// Uppdatera kategori (namn + valfri ny bild)
app.put("/api/categories/:id", requireAdmin, upload.single("image"), (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body?.categoryName || "").trim();
  if (!id || !name) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: "Invalid input" });
  }

  const existing = db.prepare(`SELECT image_url FROM categories WHERE id=?`).get(id);
  if (!existing) {
    if (req.file) fs.unlink(req.file.path, () => {});
    return res.status(404).json({ error: "Category not found" });
  }

  let newImageUrl = existing.image_url;
  if (req.file) {
    // ta bort gammal fil om den låg under /uploads
    if (existing.image_url && existing.image_url.startsWith("/uploads/")) {
      const abs = path.join(process.cwd(), existing.image_url.replace("/uploads", "uploads"));
      fs.existsSync(abs) && fs.unlink(abs, () => {});
    }
    newImageUrl = `/uploads/categories/${req.file.filename}`;
  }

  try {
    db.prepare(`UPDATE categories SET categoryName=?, image_url=? WHERE id=?`)
      .run(name, newImageUrl, id);
    res.json({ id, categoryName: name, imageUrl: newImageUrl });
  } catch (e) {
    if (String(e).includes("UNIQUE")) {
      return res.status(409).json({ error: "Category already exists" });
    }
    res.status(400).json({ error: "Could not update category" });
  }
});

// Delete kategori (force: flytta produkter -> Uncategorized)
app.delete("/api/categories/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const defaultId = ensureDefaultCategory();
  if (id === defaultId) {
    return res.status(400).json({ error: "Cannot delete 'Uncategorized' category" });
  }

  const count = db.prepare(`SELECT COUNT(*) AS c FROM products WHERE categoryId=?`).get(id)?.c || 0;
  const force = String(req.query.force || "").toLowerCase() === "true";

  if (count > 0 && !force) {
    // UI kan visa varning och prova igen med ?force=true
    return res.status(409).json({ error: "Category has products", productCount: count });
  }

  // Om det finns produkter och force=true -> flytta till default
  if (count > 0) {
    db.prepare(`UPDATE products SET categoryId=? WHERE categoryId=?`).run(defaultId, id);
  }

  const existing = db.prepare(`SELECT image_url FROM categories WHERE id=?`).get(id);
  const result = db.prepare(`DELETE FROM categories WHERE id=?`).run(id);
  if (!result.changes) return res.status(404).json({ error: "Category not found" });

  // städa upp bildfil
  if (existing?.image_url && existing.image_url.startsWith("/uploads/")) {
    const abs = path.join(process.cwd(), existing.image_url.replace("/uploads", "uploads"));
    fs.existsSync(abs) && fs.unlink(abs, () => {});
  }

  res.json({ message: "Deleted", id, movedProducts: count });
});

// --- Products (public GET, admin CUD) ---
app.get("/api/products", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT p.*, c.categoryName
    FROM products p
    JOIN categories c ON p.categoryId = c.id
    ORDER BY p.id DESC
  `
    )
    .all();
  res.json(rows);
});

app.get("/api/products/:id", (req, res) => {
  const row = db
    .prepare(
      `
    SELECT p.*, c.categoryName
    FROM products p
    JOIN categories c ON p.categoryId = c.id
    WHERE p.id = ?
  `
    )
    .get(req.params.id);
  if (!row)
    return res.status(404).json({ error: "The product does not exist" });
  res.json(row);
});

app.post("/api/products", requireAdmin, (req, res) => {
  const {
    productName,
    price,
    image,
    secondaryImage1,
    secondaryImage2,
    secondaryImage3,
    brand,
    productDescription,
    isTrending,
    categoryId,
    publishingDate,
  } = req.body;

  if (!productName || !price || !categoryId || !publishingDate) {
    return res
      .status(400)
      .json({ error: "productName, price, categoryId, publishingDate krävs" });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO products (
        productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3,
        brand, productDescription, isTrending, categoryId, publishingDate
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `);
    const result = stmt.run(
      productName,
      price,
      image,
      secondaryImage1,
      secondaryImage2,
      secondaryImage3,
      brand,
      productDescription,
      isTrending,
      categoryId,
      publishingDate
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    res
      .status(400)
      .json({ error: "Could not save product", details: String(e) });
  }
});

app.put("/api/products/:id", requireAdmin, (req, res) => {
  const {
    productName,
    price,
    image,
    secondaryImage1,
    secondaryImage2,
    secondaryImage3,
    brand,
    productDescription,
    isTrending,
    categoryId,
    publishingDate,
  } = req.body;

  const stmt = db.prepare(`
    UPDATE products SET
      productName=?, price=?, image=?, secondaryImage1=?, secondaryImage2=?, secondaryImage3=?,
      brand=?, productDescription=?, isTrending=?, categoryId=?, publishingDate=?
    WHERE id = ?
  `);
  const result = stmt.run(
    productName,
    price,
    image,
    secondaryImage1,
    secondaryImage2,
    secondaryImage3,
    brand,
    productDescription,
    isTrending,
    categoryId,
    publishingDate,
    req.params.id
  );
  if (!result.changes)
    return res.status(404).json({ error: "The product does not exist" });
  res.json({ message: "Uppdaterad" });
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const result = db
    .prepare("DELETE FROM products WHERE id = ?")
    .run(req.params.id);
  if (!result.changes)
    return res.status(404).json({ error: "The product does not exist" });
  res.json({ message: "Borttagen" });
});

// --- Hero images ---
app.get("/api/hero-images", (req, res) => {
  res.json(db.prepare("SELECT * FROM hero_images ORDER BY id").all());
});

app.put("/api/hero-images/:id", requireAdmin, (req, res) => {
  const { image_url } = req.body;
  if (!image_url)
    return res.status(400).json({ error: "image_url is required" });
  const result = db
    .prepare("UPDATE hero_images SET image_url=? WHERE id=?")
    .run(image_url, req.params.id);
  if (!result.changes)
    return res.status(404).json({ error: "Could not find hero-image" });
  res.json({ message: "Updated", id: Number(req.params.id), image_url });
});

app.post("/api/hero-images", requireAdmin, (req, res) => {
  const { image_url } = req.body;
  if (!image_url)
    return res.status(400).json({ error: "image_url is required" });
  const result = db
    .prepare("INSERT INTO hero_images (image_url) VALUES (?)")
    .run(image_url);
  res.status(201).json({ id: result.lastInsertRowid, image_url });
});

// --- Favorites ---
app.get("/api/favorites", (req, res) => {
  if (req.session.user) {
    const rows = db
      .prepare(
        `
      SELECT p.* FROM favorites f
      JOIN products p ON p.id = f.product_id
      WHERE f.user_id = ?
      ORDER BY p.id DESC
    `
      )
      .all(req.session.user.id);
    return res.json({ loggedIn: true, items: rows });
  }
  ensureGuestFavorites(req);
  if (!req.session.guestFavorites.length)
    return res.json({ loggedIn: false, items: [] });
  const inClause = req.session.guestFavorites.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT * FROM products WHERE id IN (${inClause})`)
    .all(...req.session.guestFavorites);
  res.json({ loggedIn: false, items: rows });
});

app.post("/api/favorites/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  const exists = db
    .prepare("SELECT id FROM products WHERE id=?")
    .get(productId);
  if (!exists) return res.status(404).json({ error: "Product does not exist" });

  if (req.session.user) {
    db.prepare(
      "INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?,?)"
    ).run(req.session.user.id, productId);
    return res.json({ message: "Added to favorites (user)", productId });
  }
  ensureGuestFavorites(req);
  if (!req.session.guestFavorites.includes(productId))
    req.session.guestFavorites.push(productId);
  res.json({ message: "Added to favorites (guest)", productId });
});

app.delete("/api/favorites/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  if (req.session.user) {
    db.prepare("DELETE FROM favorites WHERE user_id=? AND product_id=?").run(
      req.session.user.id,
      productId
    );
    return res.json({ message: "Removed from favorites (user)", productId });
  }
  ensureGuestFavorites(req);
  req.session.guestFavorites = req.session.guestFavorites.filter(
    (id) => id !== productId
  );
  res.json({ message: "Removed from favorites (guest)", productId });
});

// --- Cart (DB för inloggad, session för gäst) ---
app.get("/api/cart", (req, res) => {
  if (req.session.user) {
    const orderId = getOrCreateCartOrderId(req.session.user.id);
    const items = db
      .prepare(
        `
      SELECT
        oi.product_id  AS id,
        oi.product_name AS productName,
        oi.unit_price  AS price,
        oi.quantity,
        oi.line_total  AS lineTotal,
        p.image,
        p.brand
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id = ?
      ORDER BY oi.id DESC
    `
      )
      .all(orderId);

    const total = items.reduce((s, it) => s + (it.lineTotal || 0), 0);
    return res.json({ loggedIn: true, items, total });
  }

  // Gäst
  ensureGuestCart(req);
  if (req.session.guestCart.length === 0)
    return res.json({ loggedIn: false, items: [], total: 0 });

  const ids = [...new Set(req.session.guestCart.map((x) => x.productId))];
  const placeholders = ids.map(() => "?").join(",");
  const prods = db
    .prepare(
      `SELECT id, productName, price, image, brand FROM products WHERE id IN (${placeholders})`
    )
    .all(...ids);
  const map = new Map(prods.map((p) => [p.id, p]));

  const items = req.session.guestCart
    .map((x) => {
      const p = map.get(x.productId);
      if (!p) return null;
      const lineTotal = p.price * x.quantity;
      return {
        id: p.id,
        productName: p.productName,
        price: p.price,
        quantity: x.quantity,
        lineTotal,
        image: p.image,
        brand: p.brand,
      };
    })
    .filter(Boolean);

  const total = items.reduce((s, it) => s + it.lineTotal, 0);
  res.json({ loggedIn: false, items, total });
});

app.post("/api/cart/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  const prod = db
    .prepare("SELECT id, productName, price FROM products WHERE id=?")
    .get(productId);
  if (!prod) return res.status(404).json({ error: "Product does not exist" });

  if (req.session.user) {
    const orderId = getOrCreateCartOrderId(req.session.user.id);
    const existing = db
      .prepare(
        "SELECT id, quantity FROM order_items WHERE order_id=? AND product_id=?"
      )
      .get(orderId, productId);
    if (existing) {
      const newQty = existing.quantity + 1;
      db.prepare(
        `
        UPDATE order_items
           SET quantity=?,
               unit_price=?,
               price_at_purchase=?,
               product_name=?,
               line_total=? * ?
         WHERE id=?
      `
      ).run(
        newQty,
        prod.price,
        prod.price,
        prod.productName,
        prod.price,
        newQty,
        existing.id
      );
    } else {
      db.prepare(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, unit_price, product_name, line_total)
        VALUES (?,?,?,?,?,?,?)
      `
      ).run(
        orderId,
        prod.id,
        1,
        prod.price,
        prod.price,
        prod.productName,
        prod.price * 1
      );
    }
    return res.json({ message: "Added to cart (user)", productId });
  }

  // Gäst
  ensureGuestCart(req);
  const found = req.session.guestCart.find((x) => x.productId === productId);
  if (found) found.quantity += 1;
  else req.session.guestCart.push({ productId, quantity: 1 });
  res.json({ message: "Added to cart (guest)", productId });
});

app.put("/api/cart/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  const qty = Number(req.body.quantity);
  if (Number.isNaN(productId) || Number.isNaN(qty) || qty < 0)
    return res.status(400).json({ error: "Invalid product-id/quantity" });

  if (req.session.user) {
    const orderId = getOrCreateCartOrderId(req.session.user.id);
    if (qty === 0) {
      db.prepare(
        "DELETE FROM order_items WHERE order_id=? AND product_id=?"
      ).run(orderId, productId);
      return res.json({ message: "Removed item (user)", productId });
    }
    const prod = db
      .prepare("SELECT id, productName, price FROM products WHERE id=?")
      .get(productId);
    if (!prod) return res.status(404).json({ error: "Product does not exist" });

    db.prepare(
      `
      INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, unit_price, product_name, line_total)
      VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(order_id, product_id) DO UPDATE SET
        quantity=excluded.quantity,
        unit_price=excluded.unit_price,
        price_at_purchase=excluded.unit_price,
        product_name=excluded.product_name,
        line_total=excluded.unit_price * excluded.quantity
    `
    ).run(
      orderId,
      prod.id,
      qty,
      prod.price,
      prod.price,
      prod.productName,
      prod.price * qty
    );

    return res.json({
      message: "Updated item (user)",
      productId,
      quantity: qty,
    });
  }

  // Gäst
  ensureGuestCart(req);
  if (qty === 0) {
    req.session.guestCart = req.session.guestCart.filter(
      (x) => x.productId !== productId
    );
    return res.json({ message: "Removed item (guest)", productId });
  }
  const found = req.session.guestCart.find((x) => x.productId === productId);
  if (found) found.quantity = qty;
  else req.session.guestCart.push({ productId, quantity: qty });
  res.json({ message: "Updated item (guest)", productId, quantity: qty });
});

app.delete("/api/cart/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  if (req.session.user) {
    const orderId = getOrCreateCartOrderId(req.session.user.id);
    db.prepare("DELETE FROM order_items WHERE order_id=? AND product_id=?").run(
      orderId,
      productId
    );
    return res.json({ message: "Removed from cart (user)", productId });
  }

  ensureGuestCart(req);
  req.session.guestCart = req.session.guestCart.filter(
    (x) => x.productId !== productId
  );
  res.json({ message: "Removed from cart (guest)", productId });
});

// --- Orders (manuell skapning + history) ---
app.post("/api/orders", requireAuth, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items required" });

  const getProduct = db.prepare("SELECT id, price FROM products WHERE id=?");
  const insertOrder = db.prepare("INSERT INTO orders (user_id) VALUES (?)");
  const insertItem = db.prepare(
    "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?,?,?,?)"
  );

  try {
    const tx = db.transaction((userId, items) => {
      const orderResult = insertOrder.run(userId);
      const orderId = orderResult.lastInsertRowid;
      for (const it of items) {
        const qty = Number(it.quantity);
        if (!it.productId || Number.isNaN(qty) || qty <= 0)
          throw new Error("Invalid orderline");
        const prod = getProduct.get(it.productId);
        if (!prod) throw new Error(`Product ${it.productId} does not exist`);
        insertItem.run(orderId, prod.id, qty, prod.price);
      }
      return orderId;
    });

    const orderId = tx(req.session.user.id, items);
    res.status(201).json({ orderId });
  } catch (e) {
    res.status(400).json({ error: String(e.message || e) });
  }
});

// Endast inloggads ordrar (status 'created')
app.get("/api/orders", requireAuth, (req, res) => {
  const orders = db
    .prepare(
      `
      SELECT *
      FROM orders
      WHERE user_id = ? AND status='created'
      ORDER BY datetime(created_at) DESC
      `
    )
    .all(req.session.user.id);

  const itemsStmt = db.prepare(`
    SELECT oi.*, p.productName, p.image
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `);

  const result = orders.map((o) => {
    const items = itemsStmt.all(o.id).map((it) => ({
      ...it,
      unit_price: it.unit_price ?? it.price_at_purchase,
      line_total:
        it.line_total ?? (it.unit_price ?? it.price_at_purchase) * it.quantity,
    }));
    const total = items.reduce((s, x) => s + x.line_total, 0);
    return { ...o, items, total };
  });

  res.json(result);
});

app.get("/api/orders/:id", requireAuth, (req, res) => {
  const order = db
    .prepare("SELECT * FROM orders WHERE id=? AND user_id=?")
    .get(req.params.id, req.session.user.id);
  if (!order)
    return res.status(404).json({ error: "The order does not exist" });
  const items = db
    .prepare(
      `
    SELECT oi.*, p.productName, p.image
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `
    )
    .all(order.id)
    .map((it) => ({
      ...it,
      unit_price: it.unit_price ?? it.price_at_purchase,
      line_total:
        it.line_total ?? (it.unit_price ?? it.price_at_purchase) * it.quantity,
    }));
  const total = items.reduce((s, x) => s + x.line_total, 0);
  res.json({ ...order, items, total });
});

// Hämta profil (returnerar tomma strängar om profilen saknas)
app.get("/api/profile", requireAuth, (req, res) => {
  const row = db
    .prepare(
      `
    SELECT firstName, lastName, email, mobilePhone, address, city, postalCode
    FROM user_profiles WHERE user_id = ?
  `
    )
    .get(req.session.user.id);

  res.json({
    firstName: row?.firstName ?? "",
    lastName: row?.lastName ?? "",
    email: row?.email ?? "",
    mobilePhone: row?.mobilePhone ?? "",
    address: row?.address ?? "",
    city: row?.city ?? "",
    postalCode: row?.postalCode ?? "",
  });
});

// Skapa/uppdatera profil (UPSERT)
app.put("/api/profile", requireAuth, (req, res) => {
  const {
    firstName = null,
    lastName = null,
    email = null,
    mobilePhone = null,
    address = null,
    city = null,
    postalCode = null,
  } = req.body || {};

  db.prepare(
    `
    INSERT INTO user_profiles (
      user_id, firstName, lastName, email, mobilePhone, address, city, postalCode
    ) VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET
      firstName   = excluded.firstName,
      lastName    = excluded.lastName,
      email       = excluded.email,
      mobilePhone = excluded.mobilePhone,
      address     = excluded.address,
      city        = excluded.city,
      postalCode  = excluded.postalCode
  `
  ).run(
    req.session.user.id,
    firstName,
    lastName,
    email,
    mobilePhone,
    address,
    city,
    postalCode
  );

  res.json({ message: "Profile saved" });
});

// --- Checkout: konvertera 'cart' -> 'created' (inloggad) ---
app.post("/api/orders/checkout", requireAuth, (req, res) => {
  const {
    paymentMethod = null,
    // optional buyer snapshot coming from client; if missing we will fallback to profile
    firstName = null,
    lastName = null,
    email = null,
    mobilePhone = null,
    address = null,
    city = null,
    postalCode = null,
  } = req.body || {};

  // 1) Försök hitta en öppen cart
  const cart = db
    .prepare("SELECT id FROM orders WHERE user_id=? AND status='cart'")
    .get(req.session.user.id);

  if (!cart) {
    // 2) Idempotent: om cart redan konverterats, returnera senaste skapade ordern
    const recent = db
      .prepare(
        `
        SELECT id FROM orders
        WHERE user_id=? AND status='created'
        ORDER BY datetime(created_at) DESC
        LIMIT 1
      `
      )
      .get(req.session.user.id);

    if (recent) {
      return res.json({ orderId: recent.id, message: "Order already created" });
    }
    return res.status(400).json({ error: "No cart to checkout" });
  }

  // 3) Säkerställ att cart har items
  const hasItems = db
    .prepare("SELECT COUNT(*) AS c FROM order_items WHERE order_id=?")
    .get(cart.id);
  if (!hasItems.c) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  // 4) Fyll snapshot (antingen från body eller profil)
  const profile =
    db
      .prepare(
        `SELECT firstName, lastName, email, mobilePhone, address, city, postalCode
       FROM user_profiles WHERE user_id=?`
      )
      .get(req.session.user.id) || {};

  const snap = {
    firstName: firstName ?? profile.firstName ?? null,
    lastName: lastName ?? profile.lastName ?? null,
    email: email ?? profile.email ?? null,
    mobilePhone: mobilePhone ?? profile.mobilePhone ?? null,
    address: address ?? profile.address ?? null,
    city: city ?? profile.city ?? null,
    postalCode: postalCode ?? profile.postalCode ?? null,
  };

  // 5) Konvertera cart -> created och spara betalmetod + snapshot
  db.prepare(
    `
    UPDATE orders
       SET status='created',
           created_at=datetime('now'),
           payment_method = COALESCE(?, payment_method),
           buyer_firstName   = COALESCE(?, buyer_firstName),
           buyer_lastName    = COALESCE(?, buyer_lastName),
           buyer_email       = COALESCE(?, buyer_email),
           buyer_mobilePhone = COALESCE(?, buyer_mobilePhone),
           buyer_address     = COALESCE(?, buyer_address),
           buyer_city        = COALESCE(?, buyer_city),
           buyer_postalCode  = COALESCE(?, buyer_postalCode)
     WHERE id=?
  `
  ).run(
    paymentMethod,
    snap.firstName,
    snap.lastName,
    snap.email,
    snap.mobilePhone,
    snap.address,
    snap.city,
    snap.postalCode,
    cart.id
  );

  res.json({ orderId: cart.id, message: "Order created" });
});

// --- Guest checkout: konvertera gäst-session till order ---
app.post("/api/cart/guest/checkout", (req, res) => {
  // Skydda ifall någon råkar vara inloggad
  if (req.session.user) {
    return res
      .status(400)
      .json({ error: "Already logged in; use /api/orders/checkout" });
  }

  ensureGuestCart(req);
  const itemsInCart = req.session.guestCart || [];
  if (!Array.isArray(itemsInCart) || itemsInCart.length === 0) {
    // håll det “snällt” – svara 200 och töm redan tom kundvagn
    return res.json({ message: "Guest cart is already empty" });
  }

  const {
    paymentMethod = null,
    firstName = null,
    lastName = null,
    email = null,
    mobilePhone = null,
    address = null,
    city = null,
    postalCode = null,
  } = req.body || {};

  try {
    const tx = db.transaction(() => {
      // 1) Skapa order (guest -> user_id = NULL)
      const orderRes = db
        .prepare(
          `
          INSERT INTO orders (
            user_id, status, created_at, payment_method,
            buyer_firstName, buyer_lastName, buyer_email, buyer_mobilePhone, buyer_address, buyer_city, buyer_postalCode
          ) VALUES (
            NULL, 'created', datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?
          )
        `
        )
        .run(
          paymentMethod,
          firstName,
          lastName,
          email,
          mobilePhone,
          address,
          city,
          postalCode
        );
      const orderId = orderRes.lastInsertRowid;

      // 2) Lägg till orderrader från guestCart
      const getProd = db.prepare(
        "SELECT id, productName, price FROM products WHERE id=?"
      );
      const insertItem = db.prepare(
        `
        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, unit_price, product_name, line_total)
        VALUES (?,?,?,?,?,?,?)
        `
      );

      for (const it of itemsInCart) {
        const qty = Number(it.quantity);
        if (!it.productId || Number.isNaN(qty) || qty <= 0)
          throw new Error("Invalid orderline");
        const p = getProd.get(it.productId);
        if (!p) throw new Error(`Product ${it.productId} does not exist`);
        insertItem.run(
          orderId,
          p.id,
          qty,
          p.price,
          p.price,
          p.productName,
          p.price * qty
        );
      }

      return orderId;
    });

    const orderId = tx();
    // 3) Töm gäst-varukorg
    req.session.guestCart = [];
    res.json({ orderId, message: "Order created (guest)" });
  } catch (e) {
    console.error("Guest checkout failed:", e);
    res.status(400).json({ error: String(e.message || e) });
  }
});

// Uppdatera användarnamn
app.put("/api/account/username", requireAuth, (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== "string" || username.trim().length < 3) {
    return res
      .status(400)
      .json({ error: "Username måste vara minst 3 tecken" });
  }

  try {
    const exists = db
      .prepare("SELECT id FROM users WHERE username = ?")
      .get(username);
    if (exists && exists.id !== req.session.user.id) {
      return res.status(409).json({ error: "Detta användarnamn är upptaget" });
    }

    db.prepare("UPDATE users SET username=? WHERE id=?").run(
      username,
      req.session.user.id
    );

    // Uppdatera sessionen så UI visar nya namnet direkt
    req.session.user.username = username;
    res.json({ message: "Username uppdaterat", username });
  } catch (e) {
    res.status(500).json({ error: "Kunde inte uppdatera användarnamn" });
  }
});

// Uppdatera lösenord (stödjer även legacy klartext i DB)
app.put("/api/account/password", requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ error: "currentPassword och newPassword krävs" });
  }
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return res
      .status(400)
      .json({ error: "Nytt lösenord måste vara minst 6 tecken" });
  }

  const user = db
    .prepare("SELECT id, password FROM users WHERE id=?")
    .get(req.session.user.id);
  if (!user) return res.status(401).json({ error: "Inte inloggad" });

  // Tillåt jämförelse även om det är legacy klartext
  let ok = false;
  if (isBcryptHash(user.password)) {
    ok = await comparePassword(currentPassword, user.password);
  } else {
    ok = currentPassword === user.password;
  }
  if (!ok) return res.status(401).json({ error: "Fel nuvarande lösenord" });

  const hashed = await hashPassword(newPassword);
  db.prepare("UPDATE users SET password=? WHERE id=?").run(
    hashed,
    req.session.user.id
  );
  res.json({ message: "Lösenord uppdaterat" });
});

//
// --- Admin: Orders (list + delete) ---
//

// List orders with optional filters (?from=&to=&customer=)
// Only returns status='created' (carts excluded). Includes guests (user_id NULL).
app.get("/api/admin/orders", requireAdmin, (req, res) => {
  const { from, to, customer } = req.query;

  const where = ["o.status = 'created'"];
  const params = [];

  if (from) {
    where.push("date(o.created_at) >= date(?)");
    params.push(String(from));
  }
  if (to) {
    where.push("date(o.created_at) <= date(?)");
    params.push(String(to));
  }
  if (customer && String(customer).trim()) {
    where.push(`(
      COALESCE(up.firstName,'') || ' ' || COALESCE(up.lastName,'') LIKE ?
      OR COALESCE(up.email,'') LIKE ?
      OR COALESCE(u.username,'') LIKE ?
      OR COALESCE(o.buyer_firstName,'') || ' ' || COALESCE(o.buyer_lastName,'') LIKE ?
      OR COALESCE(o.buyer_email,'') LIKE ?
    )`);
    const like = `%${String(customer).trim()}%`;
    params.push(like, like, like, like, like);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  // Base orders + user + profile; prefer snapshot if profile is null (guests)
  const orders = db
    .prepare(
      `
      SELECT
        o.id, o.user_id, o.status, o.created_at, o.payment_method,
        -- effective customer fields (profile OR snapshot)
        COALESCE(up.firstName,  o.buyer_firstName)   AS firstName,
        COALESCE(up.lastName,   o.buyer_lastName)    AS lastName,
        COALESCE(up.email,      o.buyer_email)       AS email,
        COALESCE(up.mobilePhone,o.buyer_mobilePhone) AS mobilePhone,
        COALESCE(up.address,    o.buyer_address)     AS address,
        COALESCE(up.city,       o.buyer_city)        AS city,
        COALESCE(up.postalCode, o.buyer_postalCode)  AS postalCode,
        u.username
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      LEFT JOIN user_profiles up ON up.user_id = o.user_id
      ${whereSql}
      ORDER BY datetime(o.created_at) DESC
    `
    )
    .all(...params);

  if (orders.length === 0) return res.json([]);

  const ids = orders.map((o) => o.id);
  const placeholders = ids.map(() => "?").join(",");
  const rawItems = db
    .prepare(
      `
      SELECT oi.order_id, oi.product_id, oi.product_name, oi.unit_price, oi.quantity, oi.line_total, p.image
      FROM order_items oi
      LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id IN (${placeholders})
      ORDER BY oi.id ASC
    `
    )
    .all(...ids);

  const byOrder = new Map();
  for (const it of rawItems) {
    const unitPrice = it.unit_price ?? it.price_at_purchase;
    const lineTotal = it.line_total ?? unitPrice * it.quantity;
    if (!byOrder.has(it.order_id)) byOrder.set(it.order_id, []);
    byOrder.get(it.order_id).push({
      productId: it.product_id,
      productName: it.product_name,
      unitPrice,
      quantity: it.quantity,
      lineTotal,
      image: it.image || null,
    });
  }

  const result = orders.map((o) => {
    const its = byOrder.get(o.id) || [];
    const total = its.reduce((s, x) => s + (x.lineTotal || 0), 0);
    return {
      id: o.id,
      userId: o.user_id, // null = guest
      status: o.status,
      createdAt: o.created_at,
      paymentMethod: o.payment_method || null,
      customer: {
        username: o.username || null,
        firstName: o.firstName || "",
        lastName: o.lastName || "",
        email: o.email || "",
        mobilePhone: o.mobilePhone || "",
        address: o.address || "",
        city: o.city || "",
        postalCode: o.postalCode || "",
      },
      items: its,
      total,
    };
  });

  res.json(result);
});

// Delete a single order (items cascade)
app.delete("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });

  const result = db.prepare(`DELETE FROM orders WHERE id=?`).run(id);
  if (!result.changes)
    return res.status(404).json({ error: "Order not found" });
  res.json({ message: "Order deleted", id });
});

// --- Starta server ---
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
