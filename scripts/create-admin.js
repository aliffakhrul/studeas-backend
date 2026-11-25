import 'dotenv/config';
import readline from 'node:readline/promises';
import bcrypt from 'bcryptjs';
import { pool } from '../src/db.js';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

async function hiddenPassword(prompt) {
  if (!process.stdin.isTTY) throw new Error('Jalankan script ini di terminal interaktif');
  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  let value = '';
  try {
    for await (const chunk of process.stdin) {
      const char = chunk.toString();
      if (char === '\r' || char === '\n') break;
      if (char === '\u0003') throw new Error('Dibatalkan');
      if (char === '\u007f' || char === '\b') value = value.slice(0, -1);
      else value += char;
    }
  } finally {
    process.stdin.setRawMode(false);
    process.stdout.write('\n');
  }
  return value;
}

try {
  const username = (await rl.question('Username admin: ')).trim();
  const fullName = (await rl.question('Nama lengkap: ')).trim();
  if (!username || username.length > 100 || !fullName || fullName.length > 150) {
    throw new Error('Username/nama kosong atau terlalu panjang');
  }
  rl.close();
  const password = await hiddenPassword('Password (minimal 8 karakter): ');
  if (password.length < 8) throw new Error('Password minimal 8 karakter');
  const hash = await bcrypt.hash(password, 12);
  await pool.execute(
    "INSERT INTO users (username, full_name, password_hash, role) VALUES (?, ?, ?, 'admin')",
    [username, fullName, hash]
  );
  console.log(`Akun admin ${username} berhasil dibuat`);
} catch (error) {
  console.error(error.code === 'ER_DUP_ENTRY' ? 'Username sudah digunakan' : error.message);
  process.exitCode = 1;
} finally {
  rl.close();
  await pool.end();
}
