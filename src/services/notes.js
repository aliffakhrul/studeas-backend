import { HttpError, positiveId, requiredText, optionalText, optionalUrl } from '../utils.js';
export function noteInput(body) {
  const title = requiredText(body.title, 'Judul', 255);
  const categoryId = positiveId(body.category_id, 'category_id');
  const contentText = optionalText(body.content_text, 'Isi catatan', 1000000);
  const contentLink = optionalUrl(body.content_link, 'Link catatan');
  if (!contentText && !contentLink) throw new HttpError(400, 'Isi teks atau link catatan wajib diisi');
  return { title, categoryId, contentText, contentLink };
}

