import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../db/index.js';
import { getOrCreateCartOrderId } from '../db/schema.js';

const router = express.Router();

const hashPassword = async (password) => await bcrypt.hash(password, 10);
const comparePassword = async (password, hash) => await bcrypt.compare(password, hash);
function isBcryptHash(s) { return typeof s === 'string' && /^\$2[aby]\$\d{2}\$/.test(s); }

router.post('/api/auth/register', async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: 'Username and password is required' });
  const finalRole = role === 'admin' ? 'admin' : 'customer';
  try {
    const hashed = await hashPassword(password);
    const r = db.prepare(`INSERT INTO users (username, password, role) VALUES (?,?,?)`)
      .run(username, hashed, finalRole);
    res.status(201).json({ id: r.lastInsertRowid, username, role: finalRole });
  } catch {
    res.status(409).json({ error: 'This username is already taken. Please try another one' });
  }
});

router.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare(`SELECT * FROM users WHERE username=?`).get(username);
  if (!user) return res.status(401).json({ error: 'Wrong username or password' });

  let ok = false;
  if (isBcryptHash(user.password)) {
    ok = await comparePassword(password, user.password);
  } else {
    ok = password === user.password;
    if (ok) {
      const newHash = await hashPassword(password);
      db.prepare(`UPDATE users SET password=? WHERE id=?`).run(newHash, user.id);
      console.log(`Upgraded plaintext password -> bcrypt for user ${user.username}`);
    }
  }
  if (!ok) return res.status(401).json({ error: 'Wrong username or password' });

  const guestFavs = Array.isArray(req.session.guestFavorites) ? [...req.session.guestFavorites] : [];
  const guestCart = Array.isArray(req.session.guestCart) ? [...req.session.guestCart] : [];

  req.session.regenerate(async (err) => {
    if (err) return res.status(500).json({ error: 'Session error during login' });

    req.session.user = { id: user.id, username: user.username, role: user.role };

    if (guestFavs.length > 0) {
      const insertFav = db.prepare(`INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?,?)`);
      const tx = db.transaction((uid, ids) => { for (const pid of ids) insertFav.run(uid, pid); });
      tx(user.id, guestFavs);
    }
    req.session.guestFavorites = [];

    if (guestCart.length > 0) {
      const orderId = getOrCreateCartOrderId(user.id);
      const getProd = db.prepare(`SELECT id, productName, price FROM products WHERE id=?`);
      const upsert = db.prepare(`
        INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase, unit_price, product_name, line_total)
        VALUES (?,?,?,?,?,?,?)
        ON CONFLICT(order_id, product_id) DO UPDATE SET
          quantity = order_items.quantity + excluded.quantity,
          unit_price = excluded.unit_price,
          price_at_purchase = excluded.unit_price,
          product_name = excluded.product_name,
          line_total = (order_items.quantity + excluded.quantity) * excluded.unit_price
      `);
      const tx = db.transaction((oid, items) => {
        for (const it of items) {
          const p = getProd.get(it.productId);
          if (!p) continue;
          upsert.run(oid, p.id, it.quantity, p.price, p.price, p.productName, p.price * it.quantity);
        }
      });
      tx(orderId, guestCart);
      req.session.guestCart = [];
    }

    res.json({ message: 'Logged in', user: req.session.user });
  });
});


router.post('/api/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Error: Could not sign out' });
    res.clearCookie('connect.sid', { path: '/', sameSite: 'lax' });
    res.json({ message: 'Signed out' });
  });
});

router.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

import { requireAuth } from '../middleware/auth.js';

router.put('/api/account/username', requireAuth, (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({ error: 'Username måste vara minst 3 tecken' });
  }
  try {
    const exists = db.prepare(`SELECT id FROM users WHERE username=?`).get(username);
    if (exists && exists.id !== req.session.user.id) {
      return res.status(409).json({ error: 'Detta användarnamn är upptaget' });
    }
    db.prepare(`UPDATE users SET username=? WHERE id=?`).run(username, req.session.user.id);
    req.session.user.username = username;
    res.json({ message: 'Username uppdaterat', username });
  } catch {
    res.status(500).json({ error: 'Kunde inte uppdatera användarnamn' });
  }
});

router.put('/api/account/password', requireAuth, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword och newPassword krävs' });
  if (typeof newPassword !== 'string' || newPassword.length < 6) {
    return res.status(400).json({ error: 'Nytt lösenord måste vara minst 6 tecken' });
  }
  const user = db.prepare(`SELECT id, password FROM users WHERE id=?`).get(req.session.user.id);
  if (!user) return res.status(401).json({ error: 'Inte inloggad' });

  let ok = isBcryptHash(user.password)
    ? await comparePassword(currentPassword, user.password)
    : currentPassword === user.password;

  if (!ok) return res.status(401).json({ error: 'Fel nuvarande lösenord' });

  const hashed = await hashPassword(newPassword);
  db.prepare(`UPDATE users SET password=? WHERE id=?`).run(hashed, req.session.user.id);
  res.json({ message: 'Lösenord uppdaterat' });
});

export default router;
