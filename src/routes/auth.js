import { Router } from 'express';
import { pool } from '../db.js';
import { HttpError, asyncRoute, requiredText, optionalText } from '../utils.js';
import { auth, secret, userFields } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
router.post('/api/auth/register', asyncRoute(async (req, res) => {
  const username = requiredText(req.body.username, 'Username', 100);
  const fullName = requiredText(req.body.full_name, 'Nama lengkap', 150);
  const email = optionalText(req.body.email, 'Email', 255);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Email tidak valid');
  const password = requiredText(req.body.password, 'Password', 200);
  if (password.length < 8) throw new HttpError(400, 'Password minimal 8 karakter');
  const hash = await bcrypt.hash(password, 12);
  const [result] = await pool.execute(
    'INSERT INTO users (username, full_name, email, password_hash) VALUES (?, ?, ?, ?)',
    [username, fullName, email, hash]
  );
  const [rows] = await pool.execute(`SELECT ${userFields} FROM users WHERE id = ?`, [result.insertId]);
  res.status(201).json({ user: rows[0] });
}));

router.post('/api/auth/login', asyncRoute(async (req, res) => {
  const username = requiredText(req.body.username, 'Username', 100);
  const password = requiredText(req.body.password, 'Password', 200);
  const [rows] = await pool.execute('SELECT * FROM users WHERE username = ?', [username]);
  if (!rows.length || !(await bcrypt.compare(password, rows[0].password_hash))) {
    throw new HttpError(401, 'Username atau password salah');
  }
  const token = jwt.sign({}, secret(), { subject: String(rows[0].id), expiresIn: '7d' });
  const { password_hash: _hash, ...user } = rows[0];
  res.json({ token, user });
}));


export default router;
