import express from "express";
import { db } from "../db/index.js";
import { requireAuth } from "../middleware/auth.js";

const router = express.Router();

router.post("/api/orders", requireAuth, (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "items required" });

  const getProduct = db.prepare(`SELECT id, price FROM products WHERE id=?`);
  const insertOrder = db.prepare(`INSERT INTO orders (user_id) VALUES (?)`);
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (?,?,?,?)`
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

router.get("/api/orders", requireAuth, (req, res) => {
  const orders = db
    .prepare(
      `
    SELECT * FROM orders
    WHERE user_id=? AND status='created'
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

router.get("/api/orders/:id", requireAuth, (req, res) => {
  const order = db
    .prepare(`SELECT * FROM orders WHERE id=? AND user_id=?`)
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

router.post("/api/orders/checkout", requireAuth, (req, res) => {
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

  const cart = db
    .prepare(`SELECT id FROM orders WHERE user_id=? AND status='cart'`)
    .get(req.session.user.id);
  if (!cart) {
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
    if (recent)
      return res.json({ orderId: recent.id, message: "Order already created" });
    return res.status(400).json({ error: "No cart to checkout" });
  }

  const hasItems = db
    .prepare(`SELECT COUNT(*) AS c FROM order_items WHERE order_id=?`)
    .get(cart.id);
  if (!hasItems.c) return res.status(400).json({ error: "Cart is empty" });

  const profile =
    db
      .prepare(
        `
    SELECT firstName, lastName, email, mobilePhone, address, city, postalCode
    FROM user_profiles WHERE user_id=?
  `
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

router.post("/api/cart/guest/checkout", (req, res) => {
  if (req.session.user)
    return res
      .status(400)
      .json({ error: "Already logged in; use /api/orders/checkout" });

  const itemsInCart = Array.isArray(req.session.guestCart)
    ? req.session.guestCart
    : [];
  if (itemsInCart.length === 0)
    return res.json({ message: "Guest cart is already empty" });

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
      const orderRes = db
        .prepare(
          `
        INSERT INTO orders (
          user_id, status, created_at, payment_method,
          buyer_firstName, buyer_lastName, buyer_email, buyer_mobilePhone, buyer_address, buyer_city, buyer_postalCode
        ) VALUES (NULL, 'created', datetime('now'), ?, ?, ?, ?, ?, ?, ?, ?)
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

      const getProd = db.prepare(
        `SELECT id, productName, price FROM products WHERE id=?`
      );
      const insertItem = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, unit_price, product_name, line_total)
        VALUES (?,?,?,?,?,?,?)
      `);

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
    req.session.guestCart = [];
    res.json({ orderId, message: "Order created (guest)" });
  } catch (e) {
    console.error("Guest checkout failed:", e);
    res.status(400).json({ error: String(e.message || e) });
  }
});

export default router;
