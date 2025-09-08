import express from "express";
import { db } from "../db/index.js";
import { ensureGuestFavorites } from "../middleware/session-helpers.js";

const router = express.Router();

router.get("/api/favorites", (req, res) => {
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

router.post("/api/favorites/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  const exists = db
    .prepare(`SELECT id FROM products WHERE id=?`)
    .get(productId);
  if (!exists) return res.status(404).json({ error: "Product does not exist" });

  if (req.session.user) {
    db.prepare(
      `INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?,?)`
    ).run(req.session.user.id, productId);
    return res.json({ message: "Added to favorites (user)", productId });
  }
  ensureGuestFavorites(req);
  if (!req.session.guestFavorites.includes(productId))
    req.session.guestFavorites.push(productId);
  res.json({ message: "Added to favorites (guest)", productId });
});

router.delete("/api/favorites/:productId", (req, res) => {
  const productId = Number(req.params.productId);
  if (Number.isNaN(productId))
    return res.status(400).json({ error: "Invalid product-id" });

  if (req.session.user) {
    db.prepare(`DELETE FROM favorites WHERE user_id=? AND product_id=?`).run(
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

export default router;
