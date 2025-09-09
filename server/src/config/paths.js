import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(__dirname, "..", "..");
export const REPO_ROOT = path.resolve(__dirname, "..", "..", "..");


export const UPLOAD_ROOT = path.join(PROJECT_ROOT, "uploads");
export const CATEGORY_UPLOAD_DIR = path.join(UPLOAD_ROOT, "categories");

export const CLIENT_PUBLIC = path.join(REPO_ROOT, "client", "public");
export const PRODUCT_UPLOAD_DIR = path.join(CLIENT_PUBLIC, "images", "products");

export const DB_DIR = path.join(PROJECT_ROOT, "db");
export const DB_PATH = path.join(DB_DIR, "app.db");
export const SESSIONS_DB_FILENAME = "sessions.db";
