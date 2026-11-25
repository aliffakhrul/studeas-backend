import { pool } from '../db.js';
import { HttpError } from '../utils.js';
export async function categoryExists(id) {
  const [rows] = await pool.execute('SELECT id FROM categories WHERE id = ?', [id]);
  if (!rows.length) throw new HttpError(400, 'Kategori tidak ditemukan');
}

export async function validateCategories(ids) {
  const [rows] = await pool.query('SELECT id FROM categories WHERE id IN (?)', [ids]);
  if (rows.length !== ids.length) throw new HttpError(400, 'Ada kategori yang tidak ditemukan');
}

