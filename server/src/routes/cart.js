import express from "express";
import { db } from "../db/index.js";
import { ensureGuestCart } from "../middleware/session-helpers.js";
import { getOrCreateCartOrderId } from "../db/schema.js";

const router = express.Router();

router.get("/api/cart", (req, res) => {
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

router.post("/api/cart/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  const prod = db
    .prepare(`SELECT id, productName, price FROM products WHERE id=?`)
    .get(productId);
  if (!prod) return res.status(404).json({ error: "Product does not exist" });

  if (req.session.user) {
    const orderId = getOrCreateCartOrderId(req.session.user.id);
    const existing = db
      .prepare(
        `SELECT id, quantity FROM order_items WHERE order_id=? AND product_id=?`
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
         WHERE id=?`
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
        VALUES (?,?,?,?,?,?,?)`
      ).run(
        orderId,
        prod.id,
        1,
        prod.price,
        prod.price,
        prod.productName,
        prod.price
      );
    }
    return res.json({ message: "Added to cart (user)", productId });
  }

  ensureGuestCart(req);
  const found = req.session.guestCart.find((x) => x.productId === productId);
  if (found) found.quantity += 1;
  else req.session.guestCart.push({ productId, quantity: 1 });
  res.json({ message: "Added to cart (guest)", productId });
});

router.put("/api/cart/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  const qty = Number(req.body.quantity);
  if (Number.isNaN(productId) || Number.isNaN(qty) || qty < 0)
    return res.status(400).json({ error: "Invalid product-id/quantity" });

  if (req.session.user) {
    const orderId = getOrCreateCartOrderId(req.session.user.id);
    if (qty === 0) {
      db.prepare(
        `DELETE FROM order_items WHERE order_id=? AND product_id=?`
      ).run(orderId, productId);
      return res.json({ message: "Removed item (user)", productId });
    }
    const prod = db
      .prepare(`SELECT id, productName, price FROM products WHERE id=?`)
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

router.delete("/api/cart/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  if (req.session.user) {
    const orderId = getOrCreateCartOrderId(req.session.user.id);
    db.prepare(`DELETE FROM order_items WHERE order_id=? AND product_id=?`).run(
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

export default router;
