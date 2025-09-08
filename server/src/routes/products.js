import express from "express";
import { db } from "../db/index.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/api/products", (req, res) => {
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

router.get("/api/products/:id", (req, res) => {
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

router.post("/api/products", requireAdmin, (req, res) => {
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
  } = req.body || {};
  if (!productName || !price || !categoryId || !publishingDate) {
    return res
      .status(400)
      .json({ error: "productName, price, categoryId, publishingDate krävs" });
  }
  try {
    const r = db
      .prepare(
        `
      INSERT INTO products (
        productName, price, image, secondaryImage1, secondaryImage2, secondaryImage3,
        brand, productDescription, isTrending, categoryId, publishingDate
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    `
      )
      .run(
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
    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res
      .status(400)
      .json({ error: "Could not save product", details: String(e) });
  }
});

router.put("/api/products/:id", requireAdmin, (req, res) => {
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
  } = req.body || {};

  const r = db
    .prepare(
      `
    UPDATE products SET
      productName=?, price=?, image=?, secondaryImage1=?, secondaryImage2=?, secondaryImage3=?,
      brand=?, productDescription=?, isTrending=?, categoryId=?, publishingDate=?
    WHERE id=?
  `
    )
    .run(
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
  if (!r.changes)
    return res.status(404).json({ error: "The product does not exist" });
  res.json({ message: "Uppdaterad" });
});

router.delete("/api/products/:id", requireAdmin, (req, res) => {
  const r = db.prepare(`DELETE FROM products WHERE id=?`).run(req.params.id);
  if (!r.changes)
    return res.status(404).json({ error: "The product does not exist" });
  res.json({ message: "Borttagen" });
});

export default router;
