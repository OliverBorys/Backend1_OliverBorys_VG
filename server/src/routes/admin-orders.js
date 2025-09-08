import express from "express";
import { db } from "../db/index.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/api/admin/orders", requireAdmin, (req, res) => {
  const { from, to, customer } = req.query;
  const where = [`o.status = 'created'`];
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

  const orders = db
    .prepare(
      `
    SELECT
      o.id, o.user_id, o.status, o.created_at, o.payment_method,
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
    WHERE ${where.join(" AND ")}
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
    const items = byOrder.get(o.id) || [];
    const total = items.reduce((s, x) => s + (x.lineTotal || 0), 0);
    return {
      id: o.id,
      userId: o.user_id,
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
      items,
      total,
    };
  });

  res.json(result);
});

router.delete("/api/admin/orders/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) return res.status(400).json({ error: "Invalid id" });
  const r = db.prepare(`DELETE FROM orders WHERE id=?`).run(id);
  if (!r.changes) return res.status(404).json({ error: "Order not found" });
  res.json({ message: "Order deleted", id });
});

export default router;
