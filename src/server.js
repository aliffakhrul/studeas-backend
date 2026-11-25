import 'dotenv/config';
import { app } from './app.js';
import { pool } from './db.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Isi JWT_SECRET minimal 32 karakter di file .env');
}

const port = Number(process.env.PORT || 3000);
await pool.query('SELECT 1');
app.listen(port, () => console.log(`Studeas API berjalan di http://localhost:${port}`));
