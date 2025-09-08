import express from "express";
import { db } from "../db/index.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.get("/api/hero-images", (req, res) => {
  res.json(db.prepare(`SELECT * FROM hero_images ORDER BY id`).all());
});

router.put("/api/hero-images/:id", requireAdmin, (req, res) => {
  const { image_url } = req.body || {};
  if (!image_url)
    return res.status(400).json({ error: "image_url is required" });
  const r = db
    .prepare(`UPDATE hero_images SET image_url=? WHERE id=?`)
    .run(image_url, req.params.id);
  if (!r.changes)
    return res.status(404).json({ error: "Could not find hero-image" });
  res.json({ message: "Updated", id: Number(req.params.id), image_url });
});

router.post("/api/hero-images", requireAdmin, (req, res) => {
  const { image_url } = req.body || {};
  if (!image_url)
    return res.status(400).json({ error: "image_url is required" });
  const r = db
    .prepare(`INSERT INTO hero_images (image_url) VALUES (?)`)
    .run(image_url);
  res.status(201).json({ id: r.lastInsertRowid, image_url });
});

export default router;
