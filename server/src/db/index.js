import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { DB_DIR, DB_PATH } from "../config/paths.js";

fs.mkdirSync(DB_DIR, { recursive: true });

export const db = new Database(DB_PATH, { verbose: console.log });
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
