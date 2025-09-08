import express from 'express';
import { db } from '../db/index.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.get('/api/admin/users', requireAdmin, (req, res) => {
  const rows = db.prepare('SELECT id, username, role FROM users ORDER BY id').all();
  res.json(rows);
});

export default router;
