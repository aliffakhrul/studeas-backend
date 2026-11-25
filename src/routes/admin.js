import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, asyncRoute, positiveId, requiredText } from '../utils.js';
import { auth, admin } from '../middleware/auth.js';
import { attachTutorCategories } from '../services/tutors.js';

const router = Router();
router.get('/api/admin/tutors/pending', auth, admin, asyncRoute(async (_req, res) => {
  const [rows] = await pool.query(
    "SELECT t.*, u.username, u.full_name, u.email FROM tutor_profiles t JOIN users u ON u.id = t.user_id WHERE t.status_tutor = 'pending' ORDER BY t.created_at ASC"
  );
  const tutors = rows.map(({ id, ...row }) => ({ tutor_id: id, ...row }));
  res.json({ data: await attachTutorCategories(tutors) });
}));

router.patch('/api/admin/tutors/:id/decision', auth, admin, asyncRoute(async (req, res) => {
  const id = positiveId(req.params.id);
  if (!['approve', 'reject'].includes(req.body.decision)) throw new HttpError(400, 'Keputusan harus approve atau reject');
  const reason = req.body.decision === 'reject'
    ? requiredText(req.body.reason, 'Alasan penolakan', 10000) : null;
  const status = req.body.decision === 'approve' ? 'active' : 'rejected';
  const [result] = await pool.execute(
    "UPDATE tutor_profiles SET status_tutor = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = NOW() WHERE id = ? AND status_tutor = 'pending'",
    [status, reason, req.user.id, id]
  );
  if (!result.affectedRows) throw new HttpError(409, 'Pengajuan tidak ditemukan atau sudah diproses');
  res.json({ tutor_id: id, status_tutor: status, rejection_reason: reason });
}));


export default router;
