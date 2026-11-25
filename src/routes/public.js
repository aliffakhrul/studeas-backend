import { Router } from 'express';
import { pool } from '../db.js';
import { asyncRoute } from '../utils.js';
import { auth } from '../middleware/auth.js';
import { attachTutorCategories } from '../services/tutors.js';

const router = Router();
router.get('/api/health', asyncRoute(async (_req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

router.get('/api/categories', asyncRoute(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, name, slug FROM categories ORDER BY id');
  res.json({ data: rows });
}));

router.get('/api/home', asyncRoute(async (_req, res) => {
  const [[tutors], [notes]] = await Promise.all([
    pool.query('SELECT * FROM active_tutor_rankings ORDER BY average_rating DESC, rating_count DESC, tutor_id DESC LIMIT 5'),
    pool.query('SELECT * FROM note_rankings ORDER BY average_rating DESC, rating_count DESC, note_id DESC LIMIT 5')
  ]);
  res.json({ top_tutors: await attachTutorCategories(tutors), top_notes: notes });
}));


export default router;
