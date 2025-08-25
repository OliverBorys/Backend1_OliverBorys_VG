import express from "express";
import Database from "better-sqlite3";
import cors from "cors";
import bcrypt from "bcrypt";
import session from "express-session";
import connectSqlite3 from "connect-sqlite3";

// =========================
// Grundsetup
// =========================
const app = express();
const PORT = process.env.PORT || 8000;
const SQLiteStore = connectSqlite3(session);

app.use(cors({
  origin: true,
  credentials: true,
}));
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
      secure: false, // sätt till true bakom https
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dagar
    },
  })
);

// =========================
// Databas (en fil för allt)
// =========================
const db = new Database("./db/app.db", { verbose: console.log });
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// =========================
// Hjälpfunktioner
// =========================
const hashPassword = async (password) => await bcrypt.hash(password, 10);
const comparePassword = async (password, hash) => await bcrypt.compare(password, hash);

// =========================
// Schema (migrering)
// =========================
// Users
// role: 'customer' | 'admin'
db.prepare(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('customer','admin')) DEFAULT 'customer'
);`).run();

// Categories
// Fördefinierade 1..5
// 1 Shoes, 2 Clothes, 3 Bags, 4 Watches, 5 Sunglasses
db.prepare(`
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY,
  categoryName TEXT UNIQUE NOT NULL CHECK (categoryName IN ('Shoes','Clothes','Bags','Watches','Sunglasses'))
);`).run();

// Products
// publishingDate som ISO-sträng
// isNew TEXT ("true"/"false") för att matcha ditt tidigare schema
// categoryId FK -> categories.id
// image + 3 sekundära bilder
db.prepare(`
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
);`).run();

// Hero-bilder
db.prepare(`
CREATE TABLE IF NOT EXISTS hero_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_url TEXT NOT NULL
);`).run();

// Favoriter (gillade produkter av inloggade användare)
db.prepare(`
CREATE TABLE IF NOT EXISTS favorites (
  user_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  PRIMARY KEY (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);`).run();

// Orders + order_items
db.prepare(`
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'created',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase REAL NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);`).run();

// Seed kategorier (1..5) om tomt
const catCount = db.prepare(`SELECT COUNT(*) as c FROM categories;`).get().c;
if (catCount === 0) {
  const seed = db.prepare(`INSERT INTO categories (id, categoryName) VALUES (?,?)`);
  const cats = [
    [1, 'Shoes'],
    [2, 'Clothes'],
    [3, 'Bags'],
    [4, 'Watches'],
    [5, 'Sunglasses'],
  ];
  const tx = db.transaction((rows) => rows.forEach((r) => seed.run(r[0], r[1])));
  tx(cats);
}

// =========================
// Auth helpers
// =========================
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Inte inloggad" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') {
    return res.status(403).json({ error: "Endast administratör" });
  }
  next();
}

// =========================
// AUTH-rutter
// =========================
app.post("/api/auth/register", async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: "Användarnamn och lösenord krävs" });
  const finalRole = role === 'admin' ? 'admin' : 'customer';
  try {
    const hashed = await hashPassword(password);
    const stmt = db.prepare("INSERT INTO users (username, password, role) VALUES (?,?,?)");
    const result = stmt.run(username, hashed, finalRole);
    res.status(201).json({ id: result.lastInsertRowid, username, role: finalRole });
  } catch (e) {
    res.status(409).json({ error: "Användarnamnet finns redan eller DB-fel" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
  if (!user) return res.status(401).json({ error: "Fel användarnamn eller lösenord" });
  const ok = await comparePassword(password, user.password);
  if (!ok) return res.status(401).json({ error: "Fel användarnamn eller lösenord" });

  req.session.user = { id: user.id, username: user.username, role: user.role };

  // slå ihop ev. gäst-favoriter in i DB
  if (req.session.guestFavorites && req.session.guestFavorites.length) {
    const insertFav = db.prepare(`INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?,?)`);
    const tx = db.transaction((arr) => arr.forEach(pid => insertFav.run(user.id, pid)));
    tx(req.session.guestFavorites);
    req.session.guestFavorites = [];
  }

  res.json({ message: "Inloggad", user: req.session.user });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Kunde inte logga ut" });
    res.clearCookie("connect.sid");
    res.json({ message: "Utloggad" });
  });
});

app.get("/api/auth/me", (req, res) => {
  res.json({ user: req.session.user || null });
});

// =========================
// ADMIN – se alla användare (exempel)
// =========================
app.get("/api/admin/users", requireAdmin, (req, res) => {
  const rows = db.prepare("SELECT id, username, role FROM users ORDER BY id").all();
  res.json(rows);
});

// =========================
// Produkter & kategorier
// =========================
app.get("/api/categories", (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY id").all());
});

app.get("/api/products", (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, c.categoryName
    FROM products p
    JOIN categories c ON p.categoryId = c.id
    ORDER BY p.id DESC
  `).all();
  res.json(rows);
});

app.get("/api/products/:id", (req, res) => {
  const row = db.prepare(`
    SELECT p.*, c.categoryName
    FROM products p
    JOIN categories c ON p.categoryId = c.id
    WHERE p.id = ?
  `).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Produkten finns inte" });
  res.json(row);
});

app.post("/api/products", requireAdmin, (req, res) => {
  const {
    productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3,
    brand, productDescription, isNew, categoryId, publishingDate
  } = req.body;

  if (!productName || !price || !categoryId || !publishingDate) {
    return res.status(400).json({ error: "productName, price, categoryId, publishingDate krävs" });
  }

  try {
    const stmt = db.prepare(`
      INSERT INTO products (
        productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3,
        brand, productDescription, isNew, categoryId, publishingDate
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `);
    const result = stmt.run(
      productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3,
      brand, productDescription, isNew, categoryId, publishingDate
    );
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: "Kunde inte spara produkt", details: String(e) });
  }
});

app.put("/api/products/:id", requireAdmin, (req, res) => {
  const {
    productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3,
    brand, productDescription, isNew, categoryId, publishingDate
  } = req.body;

  const stmt = db.prepare(`
    UPDATE products SET
      productName=?, price=?, image=?, secondaryImage1=?, secondaryImage2=?, secondaryImage3=?,
      brand=?, productDescription=?, isNew=?, categoryId=?, publishingDate=?
    WHERE id = ?
  `);
  const result = stmt.run(
    productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3,
    brand, productDescription, isNew, categoryId, publishingDate, req.params.id
  );
  if (!result.changes) return res.status(404).json({ error: "Produkten finns inte" });
  res.json({ message: "Uppdaterad" });
});

app.delete("/api/products/:id", requireAdmin, (req, res) => {
  const result = db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Produkten finns inte" });
  res.json({ message: "Borttagen" });
});

// =========================
// Hero-bilder
// =========================
app.get("/api/hero-images", (req, res) => {
  res.json(db.prepare("SELECT * FROM hero_images ORDER BY id").all());
});

app.put("/api/hero-images/:id", requireAdmin, (req, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: "image_url krävs" });
  const result = db.prepare("UPDATE hero_images SET image_url=? WHERE id=?").run(image_url, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Hittar inte hero-bild" });
  res.json({ message: "Uppdaterad", id: Number(req.params.id), image_url });
});

app.post("/api/hero-images", requireAdmin, (req, res) => {
  const { image_url } = req.body;
  if (!image_url) return res.status(400).json({ error: "image_url krävs" });
  const result = db.prepare("INSERT INTO hero_images (image_url) VALUES (?)").run(image_url);
  res.status(201).json({ id: result.lastInsertRowid, image_url });
});

// =========================
// Favoriter (gillningar)
// =========================
// När inte inloggad sparas i session (req.session.guestFavorites = [productId...])
// När inloggad sparas i favorites-tabellen

function ensureGuestFavorites(req) {
  if (!Array.isArray(req.session.guestFavorites)) req.session.guestFavorites = [];
}

app.get("/api/favorites", (req, res) => {
  if (req.session.user) {
    const rows = db
      .prepare(`SELECT p.* FROM favorites f JOIN products p ON p.id = f.product_id WHERE f.user_id = ? ORDER BY p.id DESC`)
      .all(req.session.user.id);
    return res.json({ loggedIn: true, items: rows });
  }
  ensureGuestFavorites(req);
  if (!req.session.guestFavorites.length) return res.json({ loggedIn: false, items: [] });
  const inClause = req.session.guestFavorites.map(() => '?').join(',');
  const rows = db.prepare(`SELECT * FROM products WHERE id IN (${inClause})`).all(...req.session.guestFavorites);
  res.json({ loggedIn: false, items: rows });
});

app.post("/api/favorites/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId)) return res.status(400).json({ error: "Ogiltigt produkt-id" });

  const exists = db.prepare("SELECT id FROM products WHERE id=?").get(productId);
  if (!exists) return res.status(404).json({ error: "Produkten finns inte" });

  if (req.session.user) {
    db.prepare("INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?,?)").run(req.session.user.id, productId);
    return res.json({ message: "Tillagd i favoriter (användare)", productId });
  }
  ensureGuestFavorites(req);
  if (!req.session.guestFavorites.includes(productId)) req.session.guestFavorites.push(productId);
  res.json({ message: "Tillagd i favoriter (gäst)", productId });
});

app.delete("/api/favorites/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId)) return res.status(400).json({ error: "Ogiltigt produkt-id" });

  if (req.session.user) {
    db.prepare("DELETE FROM favorites WHERE user_id=? AND product_id=?").run(req.session.user.id, productId);
    return res.json({ message: "Borttagen från favoriter (användare)", productId });
  }
  ensureGuestFavorites(req);
  req.session.guestFavorites = req.session.guestFavorites.filter((id) => id !== productId);
  res.json({ message: "Borttagen från favoriter (gäst)", productId });
});

// =========================
// Orders
// =========================
// Skapa order: body { items: [{ productId, quantity }] }
app.post("/api/orders", requireAuth, (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: "items krävs" });

  // Hämta pris från produkttabellen, inte från klienten
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
        if (!it.productId || Number.isNaN(qty) || qty <= 0) throw new Error("Ogiltig orderrad");
        const prod = getProduct.get(it.productId);
        if (!prod) throw new Error(`Produkt ${it.productId} finns inte`);
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

// Lista inloggad användares orders med items
app.get("/api/orders", requireAuth, (req, res) => {
  const orders = db
    .prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY datetime(created_at) DESC")
    .all(req.session.user.id);
  const itemsStmt = db.prepare(`
    SELECT oi.*, p.productName, p.image
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `);
  const result = orders.map((o) => ({
    ...o,
    items: itemsStmt.all(o.id),
  }));
  res.json(result);
});

// Hämta en specifik order
app.get("/api/orders/:id", requireAuth, (req, res) => {
  const order = db.prepare("SELECT * FROM orders WHERE id=? AND user_id=?").get(req.params.id, req.session.user.id);
  if (!order) return res.status(404).json({ error: "Ordern finns inte" });
  const items = db.prepare(`
    SELECT oi.*, p.productName, p.image
    FROM order_items oi JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all(order.id);
  res.json({ ...order, items });
});

// =========================
// Starta server
// =========================
app.listen(PORT, () => console.log(`Server kör på port ${PORT}`));
