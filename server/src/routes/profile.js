import express from 'express';
import { db } from '../db/index.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.get('/api/profile', requireAuth, (req, res) => {
  const row = db.prepare(`
    SELECT firstName, lastName, email, mobilePhone, address, city, postalCode
    FROM user_profiles WHERE user_id=?
  `).get(req.session.user.id);

  res.json({
    firstName: row?.firstName ?? '',
    lastName: row?.lastName ?? '',
    email: row?.email ?? '',
    mobilePhone: row?.mobilePhone ?? '',
    address: row?.address ?? '',
    city: row?.city ?? '',
    postalCode: row?.postalCode ?? '',
  });
});

router.put('/api/profile', requireAuth, (req, res) => {
  const {
    firstName=null, lastName=null, email=null, mobilePhone=null,
    address=null, city=null, postalCode=null
  } = req.body || {};

  db.prepare(`
    INSERT INTO user_profiles (user_id, firstName, lastName, email, mobilePhone, address, city, postalCode)
    VALUES (?,?,?,?,?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET
      firstName=excluded.firstName,
      lastName=excluded.lastName,
      email=excluded.email,
      mobilePhone=excluded.mobilePhone,
      address=excluded.address,
      city=excluded.city,
      postalCode=excluded.postalCode
  `).run(req.session.user.id, firstName, lastName, email, mobilePhone, address, city, postalCode);

  res.json({ message: 'Profile saved' });
});

export default router;
