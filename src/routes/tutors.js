import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, asyncRoute, positiveId, requiredText, optionalText, ratingValue, pagination, escapeLike } from '../utils.js';
import { auth } from '../middleware/auth.js';
import { tutorInput, attachTutorCategories } from '../services/tutors.js';
import { validateCategories } from '../services/categories.js';

const router = Router();
router.get('/api/tutors', asyncRoute(async (req, res) => {
  const { page, limit, offset } = pagination(req.query);
  const sort = req.query.sort || 'newest';
  if (!['newest', 'rating', 'rating_count'].includes(sort)) throw new HttpError(400, 'Urutan tutor tidak valid');
  const where = [];
  const values = [];
  if (req.query.name) {
    where.push("t.full_name LIKE ? ESCAPE '!'");
    values.push(`%${escapeLike(requiredText(req.query.name, 'Nama', 150))}%`);
  }
  if (req.query.category_id) {
    const categoryId = positiveId(req.query.category_id, 'category_id');
    where.push('EXISTS (SELECT 1 FROM tutor_categories tc WHERE tc.tutor_id = t.tutor_id AND tc.category_id = ?)');
    values.push(categoryId);
  }
  const view = sort === 'newest' ? 'tutor_directory' : 'active_tutor_rankings';
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = sort === 'rating' ? 't.average_rating DESC, t.rating_count DESC, t.tutor_id DESC'
    : sort === 'rating_count' ? 't.rating_count DESC, t.average_rating DESC, t.tutor_id DESC'
      : 't.created_at DESC, t.tutor_id DESC';
  const [[count], [rows]] = await Promise.all([
    pool.execute(`SELECT COUNT(*) AS total FROM ${view} t ${clause}`, values),
    pool.query(`SELECT t.* FROM ${view} t ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`, [...values, limit, offset])
  ]);
  res.json({ data: await attachTutorCategories(rows), total: count[0].total, page, limit });
}));

router.get('/api/tutors/:id', asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  const [rows] = await pool.execute('SELECT * FROM tutor_directory WHERE tutor_id = ?', [id]);
  if (!rows.length) throw new HttpError(404, 'Tutor tidak ditemukan');
  res.json({ tutor: (await attachTutorCategories(rows))[0] });
}));

router.post('/api/tutors/apply', auth, asyncRoute(async (req, res) => {
  const input = tutorInput(req.body);
  await validateCategories(input.categoryIds);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.execute('SELECT id, status_tutor FROM tutor_profiles WHERE user_id = ? FOR UPDATE', [req.user.id]);
    let tutorId;
    if (existing.length) {
      if (existing[0].status_tutor !== 'rejected') throw new HttpError(409, 'Pengajuan atau profil tutor sudah ada');
      tutorId = existing[0].id;
      await connection.execute(
        "UPDATE tutor_profiles SET cv_text = ?, cv_link = ?, skills_text = ?, skills_link = ?, contact_phone = ?, status_tutor = 'pending', rejection_reason = NULL, reviewed_by = NULL, reviewed_at = NULL WHERE id = ?",
        [input.cvText, input.cvLink, input.skillsText, input.skillsLink, input.contactPhone, tutorId]
      );
      await connection.execute('DELETE FROM tutor_categories WHERE tutor_id = ?', [tutorId]);
    } else {
      const [result] = await connection.execute(
        'INSERT INTO tutor_profiles (user_id, cv_text, cv_link, skills_text, skills_link, contact_phone) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, input.cvText, input.cvLink, input.skillsText, input.skillsLink, input.contactPhone]
      );
      tutorId = result.insertId;
    }
    for (const categoryId of input.categoryIds) {
      await connection.execute('INSERT INTO tutor_categories (tutor_id, category_id) VALUES (?, ?)', [tutorId, categoryId]);
    }
    await connection.commit();
    res.status(201).json({ tutor_id: tutorId, status_tutor: 'pending' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.patch('/api/tutors/me/status', auth, asyncRoute(async (req, res) => {
  if (!['active', 'inactive'].includes(req.body.status_tutor)) throw new HttpError(400, 'Status harus active atau inactive');
  const [result] = await pool.execute(
    "UPDATE tutor_profiles SET status_tutor = ? WHERE user_id = ? AND status_tutor IN ('active', 'inactive')",
    [req.body.status_tutor, req.user.id]
  );
  if (!result.affectedRows) throw new HttpError(409, 'Tutor belum disetujui atau tidak ditemukan');
  res.json({ status_tutor: req.body.status_tutor });
}));

router.put('/api/tutors/me', auth, asyncRoute(async (req, res) => {
  const input = tutorInput(req.body);
  await validateCategories(input.categoryIds);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [profiles] = await connection.execute(
      "SELECT id FROM tutor_profiles WHERE user_id = ? AND status_tutor IN ('pending', 'active', 'inactive') FOR UPDATE",
      [req.user.id]
    );
    if (!profiles.length) throw new HttpError(404, 'Profil tutor tidak ditemukan');
    const tutorId = profiles[0].id;
    await connection.execute(
      'UPDATE tutor_profiles SET cv_text = ?, cv_link = ?, skills_text = ?, skills_link = ?, contact_phone = ? WHERE id = ?',
      [input.cvText, input.cvLink, input.skillsText, input.skillsLink, input.contactPhone, tutorId]
    );
    await connection.execute('DELETE FROM tutor_categories WHERE tutor_id = ?', [tutorId]);
    for (const categoryId of input.categoryIds) {
      await connection.execute('INSERT INTO tutor_categories (tutor_id, category_id) VALUES (?, ?)', [tutorId, categoryId]);
    }
    await connection.commit();
    res.json({ tutor_id: tutorId, message: 'Profil tutor diperbarui' });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

router.put('/api/tutors/:id/rating', auth, asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  const rating = ratingValue(req.body.rating);
  const review = optionalText(req.body.review_text, 'Ulasan', 5000);
  const [tutors] = await pool.execute("SELECT user_id FROM tutor_profiles WHERE id = ? AND status_tutor = 'active'", [id]);
  if (!tutors.length) throw new HttpError(404, 'Tutor aktif tidak ditemukan');
  if (tutors[0].user_id === req.user.id) throw new HttpError(400, 'Tidak dapat memberi rating pada diri sendiri');
  await pool.execute(
    'INSERT INTO tutor_ratings (tutor_id, user_id, rating, review_text) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE rating = VALUES(rating), review_text = VALUES(review_text)',
    [id, req.user.id, rating, review]
  );
  res.json({ tutor_id: id, rating, review_text: review });
}));


export default router;
