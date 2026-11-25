import { HttpError } from '../utils.js';
export const notFound = (_req, _res, next) => next(new HttpError(404, 'Endpoint tidak ditemukan'));
export const errorHandler = (error, _req, res, _next) => {
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Username, email, atau data sudah digunakan' });
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'JSON tidak valid' });
  const status = error.status || 500;
  if (status === 500) console.error(error);
  res.status(status).json({ error: status === 500 ? 'Terjadi kesalahan server' : error.message });
};
