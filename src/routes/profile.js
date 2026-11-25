import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, asyncRoute, requiredText, optionalText, optionalUrl } from '../utils.js';
import { auth, userFields } from '../middleware/auth.js';

const router = Router();
router.get('/api/me', auth, asyncRoute(async (req, res) => {
  const [profiles] = await pool.execute('SELECT * FROM tutor_profiles WHERE user_id = ?', [req.user.id]);
  const tutor = profiles[0] || null;
  const [categories] = tutor
    ? await pool.execute('SELECT c.id, c.name, c.slug FROM tutor_categories tc JOIN categories c ON c.id = tc.category_id WHERE tc.tutor_id = ? ORDER BY c.id', [tutor.id])
    : [[]];
  res.json({ user: req.user, tutor: tutor ? { ...tutor, categories } : null });
}));

router.patch('/api/me', auth, asyncRoute(async (req, res) => {
  const changes = [];
  const values = [];
  for (const [key, max] of [['full_name', 150], ['bio', 10000]]) {
    if (Object.hasOwn(req.body, key)) {
      changes.push(`${key} = ?`);
      values.push(key === 'full_name' ? requiredText(req.body[key], 'Nama lengkap', max) : optionalText(req.body[key], 'Bio', max));
    }
  }
  if (Object.hasOwn(req.body, 'profile_photo_url')) {
    changes.push('profile_photo_url = ?');
    values.push(optionalUrl(req.body.profile_photo_url, 'Foto profil'));
  }
  if (!changes.length) throw new HttpError(400, 'Tidak ada data yang diubah');
  await pool.execute(`UPDATE users SET ${changes.join(', ')} WHERE id = ?`, [...values, req.user.id]);
  const [rows] = await pool.execute(`SELECT ${userFields} FROM users WHERE id = ?`, [req.user.id]);
  res.json({ user: rows[0] });
}));


export default router;
