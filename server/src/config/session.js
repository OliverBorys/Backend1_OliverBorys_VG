import session from "express-session";
import connectSqlite3 from "connect-sqlite3";
import path from "path";
import { DB_DIR, SESSIONS_DB_FILENAME } from "./paths.js";

const SQLiteStore = connectSqlite3(session);

export function sessionMiddleware() {
  return session({
    store: new SQLiteStore({ db: SESSIONS_DB_FILENAME, dir: DB_DIR }),
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 7,
    },
  });
}
