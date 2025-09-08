import fs from "fs";
import path from "path";
import express from "express";
import multer from "multer";
import { UPLOAD_ROOT, CATEGORY_UPLOAD_DIR } from "./paths.js";

fs.mkdirSync(CATEGORY_UPLOAD_DIR, { recursive: true });

export const uploadsStatic = express.static(UPLOAD_ROOT, {
  setHeaders(res, filePath) {
    if (filePath.endsWith(".avif")) res.setHeader("Content-Type", "image/avif");
    else if (filePath.endsWith(".webp"))
      res.setHeader("Content-Type", "image/webp");
    else if (filePath.endsWith(".svg"))
      res.setHeader("Content-Type", "image/svg+xml");
  },
});

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CATEGORY_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = Date.now() + "-" + Math.random().toString(16).slice(2) + ext;
    cb(null, safe);
  },
});
export const uploadCategoryImage = multer({ storage });

export function unlinkUploadedUrl(urlPath) {
  try {
    if (!urlPath || !urlPath.startsWith("/uploads/")) return;
    const abs = path.join(UPLOAD_ROOT, urlPath.replace("/uploads/", ""));
    if (fs.existsSync(abs)) fs.unlink(abs, () => {});
  } catch {}
}
