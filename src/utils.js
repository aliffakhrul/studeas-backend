export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export function positiveId(value, label = 'ID') {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1) throw new HttpError(400, `${label} tidak valid`);
  return number;
}

export function requiredText(value, label, max = 10000) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw new HttpError(400, `${label} wajib diisi (maksimal ${max} karakter)`);
  }
  return value.trim();
}

export function optionalText(value, label, max = 10000) {
  if (value == null || value === '') return null;
  return requiredText(value, label, max);
}

export function optionalUrl(value, label) {
  const text = optionalText(value, label, 2048);
  if (text === null) return null;
  try {
    const url = new URL(text);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error();
  } catch {
    throw new HttpError(400, `${label} harus berupa URL http/https`);
  }
  return text;
}

export function ratingValue(value) {
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'Rating harus berupa bilangan 1 sampai 5');
  }
  return rating;
}

export function pagination(query) {
  const page = query.page === undefined ? 1 : positiveId(query.page, 'page');
  const limit = query.limit === undefined ? 20 : positiveId(query.limit, 'limit');
  if (limit > 100) throw new HttpError(400, 'limit maksimal 100');
  return { page, limit, offset: (page - 1) * limit };
}

export function escapeLike(value) {
  return value.replace(/[!%_]/g, '!$&');
}
