import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import multer from "multer";
import {
  UPLOAD_ROOT,
  CATEGORY_UPLOAD_DIR,
  PRODUCT_UPLOAD_DIR,
  CLIENT_PUBLIC,
  PROJECT_ROOT,
} from "./paths.js";

fs.mkdirSync(CATEGORY_UPLOAD_DIR, { recursive: true });
fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });

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

const productStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PRODUCT_UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const safe = Date.now() + "-" + Math.random().toString(16).slice(2) + ext;
    cb(null, safe);
  },
});
export const uploadProductImages = multer({ storage: productStorage }).fields([
  { name: "image", maxCount: 1 },
  { name: "secondaryImage1", maxCount: 1 },
  { name: "secondaryImage2", maxCount: 1 },
  { name: "secondaryImage3", maxCount: 1 },
]);

export function unlinkUploadedUrl(urlPath) {
  try {
    if (!urlPath) return;

    const rel = urlPath.replace(/^\/+/, "");

    let abs = null;

    if (rel.startsWith("images/")) {
      abs = path.join(CLIENT_PUBLIC, rel);
    } else if (rel.startsWith("uploads/")) {
      abs = path.join(PROJECT_ROOT, rel);
    } else {
      console.warn("unlinkUploadedUrl: Unknown prefix for", urlPath);
      return;
    }

    if (fs.existsSync(abs)) {
      fs.unlink(abs, (err) => {
        if (err) console.error("unlinkUploadedUrl: failed to unlink", abs, err);
      });
    } else {
      console.warn("unlinkUploadedUrl: file not found", abs);
    }
  } catch (e) {
    console.error("unlinkUploadedUrl error:", e);
  }
}
