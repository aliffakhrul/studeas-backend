import jwt from 'jsonwebtoken';
import { pool } from '../db.js';
import { HttpError } from '../utils.js';
export const secret = () => {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET harus diisi minimal 32 karakter');
  }
  return process.env.JWT_SECRET;
};

export const userFields = 'id, username, full_name, email, role, bio, profile_photo_url, created_at';

export async function auth(req, _res, next) {
  try {
    const match = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
    if (!match) throw new HttpError(401, 'Token login diperlukan');
    const payload = jwt.verify(match[1], secret());
    const [rows] = await pool.execute(`SELECT ${userFields} FROM users WHERE id = ?`, [payload.sub]);
    if (!rows.length) throw new HttpError(401, 'Akun tidak ditemukan');
    req.user = rows[0];
    next();
  } catch (error) {
    next(error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError'
      ? new HttpError(401, 'Token tidak valid atau kedaluwarsa') : error);
  }
}

export function admin(req, _res, next) {
  if (req.user.role !== 'admin') return next(new HttpError(403, 'Hanya admin yang dapat mengakses fitur ini'));
  next();
}

