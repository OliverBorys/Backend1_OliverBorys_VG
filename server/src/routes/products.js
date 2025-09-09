import express from "express";
import { db } from "../db/index.js";
import { requireAdmin } from "../middleware/auth.js";
import { uploadProductImages, unlinkUploadedUrl } from "../config/uploads.js";

const router = express.Router();

router.get("/api/products", (_req, res) => {
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

/** READ */
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

/** CREATE */
router.post("/api/products", requireAdmin, uploadProductImages, (req, res) => {
  const {
    productName,
    price,
    brand,
    productDescription,
    isTrending,
    categoryId,
    publishingDate,
  } = req.body || {};

  if (!productName || price == null || !categoryId || !publishingDate) {
    return res.status(400).json({
      error: "productName, price, categoryId, publishingDate krävs",
    });
  }

  const priceNum = Number(price);
  const categoryIdNum = Number(categoryId);
  const trending = String(isTrending) === "true" ? "yes" : "no";

  const f = req.files || {};
  const image = f.image?.[0] ? `/images/products/${f.image[0].filename}` : null;
  const secondaryImage1 = f.secondaryImage1?.[0]
    ? `/images/products/${f.secondaryImage1[0].filename}`
    : null;
  const secondaryImage2 = f.secondaryImage2?.[0]
    ? `/images/products/${f.secondaryImage2[0].filename}`
    : null;
  const secondaryImage3 = f.secondaryImage3?.[0]
    ? `/images/products/${f.secondaryImage3[0].filename}`
    : null;

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
        priceNum,
        image,
        secondaryImage1,
        secondaryImage2,
        secondaryImage3,
        brand,
        productDescription,
        trending,
        categoryIdNum,
        publishingDate
      );

    res.status(201).json({ id: r.lastInsertRowid });
  } catch (e) {
    res
      .status(400)
      .json({ error: "Could not save product", details: String(e) });
  }
});

/** UPDATE */
router.put(
  "/api/products/:id",
  requireAdmin,
  uploadProductImages,
  (req, res) => {
    const {
      productName,
      price,
      brand,
      productDescription,
      isTrending,
      categoryId,
      publishingDate,
    } = req.body || {};

    const current = db
      .prepare(
        `
    SELECT image, secondaryImage1, secondaryImage2, secondaryImage3
    FROM products WHERE id=?
  `
      )
      .get(req.params.id);

    if (!current)
      return res.status(404).json({ error: "The product does not exist" });

    const priceNum = Number(price);
    const categoryIdNum = Number(categoryId);
    const trending = String(isTrending) === "true" ? "yes" : "no";

    const f = req.files || {};
    const newImage = f.image?.[0]
      ? `/images/products/${f.image[0].filename}`
      : null;
    const newSecondaryImage1 = f.secondaryImage1?.[0]
      ? `/images/products/${f.secondaryImage1[0].filename}`
      : null;
    const newSecondaryImage2 = f.secondaryImage2?.[0]
      ? `/images/products/${f.secondaryImage2[0].filename}`
      : null;
    const newSecondaryImage3 = f.secondaryImage3?.[0]
      ? `/images/products/${f.secondaryImage3[0].filename}`
      : null;

    if (newImage && current.image) unlinkUploadedUrl(current.image);
    if (newSecondaryImage1 && current.secondaryImage1)
      unlinkUploadedUrl(current.secondaryImage1);
    if (newSecondaryImage2 && current.secondaryImage2)
      unlinkUploadedUrl(current.secondaryImage2);
    if (newSecondaryImage3 && current.secondaryImage3)
      unlinkUploadedUrl(current.secondaryImage3);

    const image = newImage ?? current.image;
    const secondaryImage1 = newSecondaryImage1 ?? current.secondaryImage1;
    const secondaryImage2 = newSecondaryImage2 ?? current.secondaryImage2;
    const secondaryImage3 = newSecondaryImage3 ?? current.secondaryImage3;

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
        priceNum,
        image,
        secondaryImage1,
        secondaryImage2,
        secondaryImage3,
        brand,
        productDescription,
        trending,
        categoryIdNum,
        publishingDate,
        req.params.id
      );

    if (!r.changes)
      return res.status(404).json({ error: "The product does not exist" });
    res.json({ message: "Uppdaterad" });
  }
);

/** DELETE */
router.delete("/api/products/:id", requireAdmin, (req, res) => {
  const product = db
    .prepare(
      `
    SELECT image, secondaryImage1, secondaryImage2, secondaryImage3
    FROM products WHERE id=?
  `
    )
    .get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: "The product does not exist" });
  }

  [
    product.image,
    product.secondaryImage1,
    product.secondaryImage2,
    product.secondaryImage3,
  ].forEach((imgPath) => {
    if (imgPath) unlinkUploadedUrl(imgPath);
  });

  const r = db.prepare(`DELETE FROM products WHERE id=?`).run(req.params.id);

  if (!r.changes) {
    return res.status(404).json({ error: "The product could not be deleted" });
  }

  res.json({ message: "Produkt och tillhörande bilder borttagna" });
});

export default router;
