import express from "express";
import cors from "cors";

import { uploadsStatic } from "./config/uploads.js";
import path from "path";
import { CLIENT_PUBLIC } from "./config/paths.js";

import { sessionMiddleware } from "./config/session.js";

import { db } from "./db/index.js";
import {
  createBaseSchema,
  runMigrations,
  seedCategoriesOnce,
} from "./db/schema.js";

createBaseSchema();
runMigrations();
seedCategoriesOnce();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use(sessionMiddleware());

app.use("/uploads", uploadsStatic);
app.use(express.static(CLIENT_PUBLIC));

import authRoutes from "./routes/auth.js";
import categoryRoutes from "./routes/categories.js";
import productRoutes from "./routes/products.js";
import heroImagesRoutes from "./routes/hero-images.js";
import favoritesRoutes from "./routes/favorites.js";
import cartRoutes from "./routes/cart.js";
import ordersRoutes from "./routes/orders.js";
import adminOrdersRoutes from "./routes/admin-orders.js";
import adminUsersRoutes from "./routes/admin-users.js";
import profileRoutes from './routes/profile.js';


app.use(authRoutes);
app.use(categoryRoutes);
app.use(productRoutes);
app.use(heroImagesRoutes);
app.use(favoritesRoutes);
app.use(cartRoutes);
app.use(ordersRoutes);
app.use(adminOrdersRoutes);
app.use(adminUsersRoutes);
app.use(profileRoutes);

export default app;
