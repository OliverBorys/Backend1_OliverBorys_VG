import express from "express";
import { db } from "../db/index.js";
import { requireAdmin } from "../middleware/auth.js";
import { uploadCategoryImage, unlinkUploadedUrl } from "../config/uploads.js";
import { ensureDefaultCategory } from "../db/schema.js";

const router = express.Router();

router.get("/api/categories", requireAdmin, (req, res) => {
  const rows = db
    .prepare(
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
    )
    .all();
  res.json(rows);
});

router.get("/api/categories/public", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT id, categoryName, image_url AS imageUrl
    FROM categories
    WHERE LOWER(categoryName) <> 'uncategorized'
    ORDER BY id ASC
  `
    )
    .all();
  res.json(rows);
});

router.post(
  "/api/categories",
  requireAdmin,
  uploadCategoryImage.single("image"),
  (req, res) => {
    const name = String(req.body?.categoryName || "").trim();
    if (!name) {
      if (req.file)
        unlinkUploadedUrl(`/uploads/categories/${req.file.filename}`);
      return res.status(400).json({ error: "categoryName required" });
    }
    const imageUrl = req.file
      ? `/uploads/categories/${req.file.filename}`
      : null;
    try {
      const r = db
        .prepare(
          `INSERT INTO categories (categoryName, image_url) VALUES (?,?)`
        )
        .run(name, imageUrl);
      res
        .status(201)
        .json({
          id: r.lastInsertRowid,
          categoryName: name,
          imageUrl,
          productCount: 0,
        });
    } catch (e) {
      if (req.file)
        unlinkUploadedUrl(`/uploads/categories/${req.file.filename}`);
      if (String(e).includes("UNIQUE"))
        return res.status(409).json({ error: "Category already exists" });
      res.status(400).json({ error: "Could not create category" });
    }
  }
);

router.put(
  "/api/categories/:id",
  requireAdmin,
  uploadCategoryImage.single("image"),
  (req, res) => {
    const id = Number(req.params.id);
    const name = String(req.body?.categoryName || "").trim();
    if (!id || !name) {
      if (req.file)
        unlinkUploadedUrl(`/uploads/categories/${req.file.filename}`);
      return res.status(400).json({ error: "Invalid input" });
    }

    const existing = db
      .prepare(`SELECT image_url FROM categories WHERE id=?`)
      .get(id);
    if (!existing) {
      if (req.file)
        unlinkUploadedUrl(`/uploads/categories/${req.file.filename}`);
      return res.status(404).json({ error: "Category not found" });
    }

    let newImageUrl = existing.image_url;
    if (req.file) {
      if (existing.image_url && existing.image_url.startsWith("/uploads/")) {
        unlinkUploadedUrl(existing.image_url);
      }
      newImageUrl = `/uploads/categories/${req.file.filename}`;
    }

    try {
      db.prepare(
        `UPDATE categories SET categoryName=?, image_url=? WHERE id=?`
      ).run(name, newImageUrl, id);
      res.json({ id, categoryName: name, imageUrl: newImageUrl });
    } catch (e) {
      if (String(e).includes("UNIQUE"))
        return res.status(409).json({ error: "Category already exists" });
      res.status(400).json({ error: "Could not update category" });
    }
  }
);

router.delete("/api/categories/:id", requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id" });

  const defaultId = ensureDefaultCategory();
  if (id === defaultId)
    return res
      .status(400)
      .json({ error: "Cannot delete 'Uncategorized' category" });

  const count =
    db.prepare(`SELECT COUNT(*) AS c FROM products WHERE categoryId=?`).get(id)
      ?.c || 0;
  const force = String(req.query.force || "").toLowerCase() === "true";

  if (count > 0 && !force) {
    return res
      .status(409)
      .json({ error: "Category has products", productCount: count });
  }

  if (count > 0) {
    db.prepare(`UPDATE products SET categoryId=? WHERE categoryId=?`).run(
      defaultId,
      id
    );
  }

  const existing = db
    .prepare(`SELECT image_url FROM categories WHERE id=?`)
    .get(id);
  const r = db.prepare(`DELETE FROM categories WHERE id=?`).run(id);
  if (!r.changes) return res.status(404).json({ error: "Category not found" });

  if (existing?.image_url && existing.image_url.startsWith("/uploads/")) {
    unlinkUploadedUrl(existing.image_url);
  }
  res.json({ message: "Deleted", id, movedProducts: count });
});

export default router;
