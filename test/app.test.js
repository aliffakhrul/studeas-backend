import test from 'node:test';
import assert from 'node:assert/strict';
import { app } from '../src/app.js';

test('registrasi menolak input tidak valid sebelum mengakses database', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: 'user', full_name: 'User', password: 'pendek' })
    });
    assert.equal(response.status, 400);
    assert.match((await response.json()).error, /Password minimal 8/);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('endpoint admin memerlukan token', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/admin/tutors/pending`);
    assert.equal(response.status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('preflight menerima port Flutter lokal yang berubah dan menolak origin lain', async () => {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const url = `http://127.0.0.1:${port}/api/auth/register`;
    const headers = {
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type'
    };
    const allowed = await fetch(url, { method: 'OPTIONS', headers: { ...headers, origin: 'http://localhost:57549' } });
    assert.equal(allowed.status, 204);
    assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:57549');

    const denied = await fetch(url, { method: 'OPTIONS', headers: { ...headers, origin: 'https://example.org' } });
    assert.equal(denied.headers.get('access-control-allow-origin'), null);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
