import test from 'node:test';
import assert from 'node:assert/strict';
import { HttpError, pagination, positiveId, ratingValue, optionalUrl, escapeLike } from '../src/utils.js';

test('ID dan rating hanya menerima bilangan valid', () => {
  assert.equal(positiveId('12'), 12);
  assert.equal(ratingValue(5), 5);
  assert.throws(() => positiveId('1 OR 1=1'), HttpError);
  assert.throws(() => ratingValue(0), HttpError);
  assert.throws(() => ratingValue(6), HttpError);
});

test('paginasi dibatasi dan URL hanya http/https', () => {
  assert.deepEqual(pagination({ page: '2', limit: '10' }), { page: 2, limit: 10, offset: 10 });
  assert.throws(() => pagination({ limit: '101' }), HttpError);
  assert.equal(optionalUrl('https://example.com', 'Link'), 'https://example.com');
  assert.throws(() => optionalUrl('javascript:alert(1)', 'Link'), HttpError);
});

test('karakter wildcard pencarian nama di-escape', () => {
  assert.equal(escapeLike('a%b_c!d'), 'a!%b!_c!!d');
});
