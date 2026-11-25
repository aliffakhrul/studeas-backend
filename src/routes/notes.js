import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, asyncRoute, positiveId, optionalText, ratingValue, pagination } from '../utils.js';
import { auth } from '../middleware/auth.js';
import { noteInput } from '../services/notes.js';
import { categoryExists } from '../services/categories.js';

const router = Router();
router.get('/api/notes', asyncRoute(async (req, res) => {
  const { page, limit, offset } = pagination(req.query);
  const sort = req.query.sort || 'newest';
  if (!['newest', 'rating', 'rating_count'].includes(sort)) throw new HttpError(400, 'Urutan catatan tidak valid');
  const where = req.query.category_id ? 'WHERE category_id = ?' : '';
  const values = req.query.category_id ? [positiveId(req.query.category_id, 'category_id')] : [];
  const order = sort === 'rating' ? 'average_rating DESC, rating_count DESC, note_id DESC'
    : sort === 'rating_count' ? 'rating_count DESC, average_rating DESC, note_id DESC'
      : 'created_at DESC, note_id DESC';
  const [[count], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM note_rankings ${where}`, values),
    pool.query(`SELECT * FROM note_rankings ${where} ORDER BY ${order} LIMIT ? OFFSET ?`, [...values, limit, offset])
  ]);
  res.json({ data: rows, total: count[0].total, page, limit });
}));

router.get('/api/notes/:id', asyncRoute(async (req, res) => {
  const [rows] = await pool.execute('SELECT * FROM note_rankings WHERE note_id = ?', [positiveId(req.params.id)]);
  if (!rows.length) throw new HttpError(404, 'Catatan tidak ditemukan');
  res.json({ note: rows[0] });
}));

router.post('/api/notes', auth, asyncRoute(async (req, res) => {
  const note = noteInput(req.body);
  await categoryExists(note.categoryId);
  const [result] = await pool.execute(
    'INSERT INTO notes (user_id, category_id, title, content_text, content_link) VALUES (?, ?, ?, ?, ?)',
    [req.user.id, note.categoryId, note.title, note.contentText, note.contentLink]
  );
  const [rows] = await pool.execute('SELECT * FROM note_rankings WHERE note_id = ?', [result.insertId]);
  res.status(201).json({ note: rows[0] });
}));

router.put('/api/notes/:id', auth, asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  const note = noteInput(req.body);
  await categoryExists(note.categoryId);
  const [result] = await pool.execute(
    'UPDATE notes SET category_id = ?, title = ?, content_text = ?, content_link = ? WHERE id = ? AND user_id = ?',
    [note.categoryId, note.title, note.contentText, note.contentLink, id, req.user.id]
  );
  if (!result.affectedRows) throw new HttpError(404, 'Catatan milik Anda tidak ditemukan');
  const [rows] = await pool.execute('SELECT * FROM note_rankings WHERE note_id = ?', [id]);
  res.json({ note: rows[0] });
}));

router.delete('/api/notes/:id', auth, asyncRoute(async (req, res) => {
  const [result] = await pool.execute('DELETE FROM notes WHERE id = ? AND user_id = ?', [positiveId(req.params.id), req.user.id]);
  if (!result.affectedRows) throw new HttpError(404, 'Catatan milik Anda tidak ditemukan');
  res.status(204).end();
}));

router.put('/api/notes/:id/rating', auth, asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  const rating = ratingValue(req.body.rating);
  const review = optionalText(req.body.review_text, 'Ulasan', 5000);
  const [notes] = await pool.execute('SELECT user_id FROM notes WHERE id = ?', [id]);
  if (!notes.length) throw new HttpError(404, 'Catatan tidak ditemukan');
  if (notes[0].user_id === req.user.id) throw new HttpError(400, 'Tidak dapat memberi rating pada catatan sendiri');
  await pool.execute(
    'INSERT INTO note_ratings (note_id, user_id, rating, review_text) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text)',
    [id, req.user.id, rating, review]
  );
  res.json({ note_id: id, rating, review_text: review });
}));


export default router;
