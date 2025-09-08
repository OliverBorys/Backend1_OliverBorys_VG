import { db } from "./index.js";

function columnExists(table, col) {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all();
  return rows.some((r) => r.name === col);
}

export function createBaseSchema() {
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

  db.prepare(
    `
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
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

  db.prepare(
    `
CREATE UNIQUE INDEX IF NOT EXISTS ux_order_items_order_product
  ON order_items(order_id, product_id);`
  ).run();

  db.prepare(
    `
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id INTEGER PRIMARY KEY,
  firstName   TEXT,
  lastName    TEXT,
  email       TEXT,
  mobilePhone TEXT,
  address     TEXT,
  city        TEXT,
  postalCode  TEXT,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);`
  ).run();

  db.prepare(
    `
CREATE TRIGGER IF NOT EXISTS trg_user_profiles_updated_at
AFTER UPDATE ON user_profiles
FOR EACH ROW
BEGIN
  UPDATE user_profiles SET updated_at = datetime('now') WHERE user_id = NEW.user_id;
END;`
  ).run();
}

export function runMigrations() {
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
      ON order_items(order_id, product_id);`
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

  try {
    if (!columnExists("categories", "image_url")) {
      db.prepare(`ALTER TABLE categories ADD COLUMN image_url TEXT`).run();
    }
  } catch (e) {
    console.error("categories add image_url failed:", e);
  }

  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_orders_status_created_at ON orders(status, created_at);`
  ).run();
  db.prepare(
    `CREATE INDEX IF NOT EXISTS idx_orders_user_id_status ON orders(user_id, status);`
  ).run();
}

export function seedCategoriesOnce() {
  const c = db.prepare(`SELECT COUNT(*) AS c FROM categories;`).get().c;
  if (c === 0) {
    const seed = db.prepare(`INSERT INTO categories (categoryName) VALUES (?)`);
    const cats = ["Shoes", "Clothes", "Bags", "Watches", "Sunglasses"];
    const tx = db.transaction((rows) => rows.forEach((name) => seed.run(name)));
    tx(cats);
  }
}

export function ensureDefaultCategory() {
  const row = db
    .prepare(`SELECT id FROM categories WHERE categoryName = 'Uncategorized'`)
    .get();
  if (row) return row.id;
  const ins = db
    .prepare(
      `INSERT INTO categories (categoryName, image_url) VALUES (?, NULL)`
    )
    .run("Uncategorized");
  return ins.lastInsertRowid;
}

export function getOrCreateCartOrderId(userId) {
  const row = db
    .prepare(`SELECT id FROM orders WHERE user_id=? AND status='cart'`)
    .get(userId);
  if (row) return row.id;
  const result = db
    .prepare(`INSERT INTO orders (user_id, status) VALUES (?, 'cart')`)
    .run(userId);
  return result.lastInsertRowid;
}
