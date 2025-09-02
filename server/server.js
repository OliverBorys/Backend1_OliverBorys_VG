import express from "express";
import Database from "better-sqlite3";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";

const app = express();
const PORT = process.env.PORT || 8000;
const SQLiteStore = connectSqlite3(session);

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

// --- Schema ---
db.prepare(
  `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','admin')) DEFAULT 'customer'
);`
).run();

db.prepare(
  `
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  categoryName TEXT UNIQUE NOT NULL CHECK (categoryName IN ('Shoes','Clothes','Bags','Watches','Sunglasses'))
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
  isNew TEXT,
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

db.prepare(
  `
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`
).run();

/**
 * OBS: order_items har nu nya kolumner (product_name, unit_price, line_total).
 * Tabellen skapas med rätt schema för nya DB:er, och vi kör en migration under för befintliga DB:er.
 */
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

// --- Engångs-seed av kategorier ---
const catCount = db.prepare(`SELECT COUNT(*) as c FROM categories;`).get().c;
if (catCount === 0) {
  const seed = db.prepare(
    `INSERT INTO categories (id, categoryName) VALUES (?,?)`
  );
  const cats = [
    [1, "Shoes"],
    [2, "Clothes"],
    [3, "Bags"],
    [4, "Watches"],
    [5, "Sunglasses"],
  ];
  const tx = db.transaction((rows) =>
    rows.forEach((r) => seed.run(r[0], r[1]))
  );
  tx(cats);
}

// --- Migration för befintliga DB:er: lägg till nya kolumner om de saknas och initiera värden ---
function columnExists(table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === col);
}

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

  // Initiera nullade fält baserat på befintliga data
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
      db.prepare("UPDATE users SET password=? WHERE id=?").run(newHash, user.id);
      console.log(`Upgraded plaintext password -> bcrypt for user ${user.username}`);
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

// --- Data (categories/products/hero_images) ---
app.get("/api/categories", (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY id").all());
});

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
    isNew,
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
        brand, productDescription, isNew, categoryId, publishingDate
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
      isNew,
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
    isNew,
    categoryId,
    publishingDate,
  } = req.body;

  const stmt = db.prepare(`
    UPDATE products SET
      productName=?, price=?, image=?, secondaryImage1=?, secondaryImage2=?, secondaryImage3=?,
      brand=?, productDescription=?, isNew=?, categoryId=?, publishingDate=?
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
    isNew,
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

app.get("/api/orders", requireAuth, (req, res) => {
  const orders = db
    .prepare(
      "SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC"
    )
    .all(req.session.user.id);
  const itemsStmt = db.prepare(`
    SELECT oi.*, p.productName, p.image
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `);
  const result = orders.map((o) => ({ ...o, items: itemsStmt.all(o.id) }));
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
    .all(order.id);
  res.json({ ...order, items });
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

// --- Checkout: konvertera 'cart' -> 'created' ---
app.post("/api/orders/checkout", requireAuth, (req, res) => {
  const order = db
    .prepare("SELECT id FROM orders WHERE user_id=? AND status='cart'")
    .get(req.session.user.id);

  if (!order) {
    return res.status(400).json({ error: "No cart to checkout" });
  }

  const hasItems = db
    .prepare("SELECT COUNT(*) AS c FROM order_items WHERE order_id=?")
    .get(order.id);

  if (!hasItems.c) {
    return res.status(400).json({ error: "Cart is empty" });
  }

  db.prepare(
    "UPDATE orders SET status='created', created_at=datetime('now') WHERE id=?"
  ).run(order.id);

  res.json({ orderId: order.id, message: "Order created" });
});

app.post("/api/cart/guest/checkout", (req, res) => {
  // Skydda ifall någon råkar vara inloggad
  if (req.session.user) {
    return res
      .status(400)
      .json({ error: "Already logged in; use /api/orders/checkout" });
  }
  if (
    !Array.isArray(req.session.guestCart) ||
    req.session.guestCart.length === 0
  ) {
    return res.json({ message: "Guest cart already empty" });
  }
  req.session.guestCart = [];
  res.json({ message: "Guest cart cleared" });
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

// --- Starta server ---
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
