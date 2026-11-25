import { pool } from '../db.js';
import { HttpError, positiveId, requiredText, optionalText, optionalUrl } from '../utils.js';
export function tutorInput(body) {
  if (!Array.isArray(body.category_ids) || !body.category_ids.length) {
    throw new HttpError(400, 'Pilih minimal satu bidang keahlian');
  }
  const categoryIds = [...new Set(body.category_ids.map((id) => positiveId(id, 'category_id')))];
  const cvText = optionalText(body.cv_text, 'CV', 30000);
  const cvLink = optionalUrl(body.cv_link, 'Link CV');
  if (!cvText && !cvLink) throw new HttpError(400, 'CV teks atau link wajib diisi');
  return {
    categoryIds,
    cvText,
    cvLink,
    skillsText: requiredText(body.skills_text, 'Kemampuan', 30000),
    skillsLink: optionalUrl(body.skills_link, 'Link kemampuan'),
    contactPhone: requiredText(body.contact_phone, 'Nomor kontak', 30)
  };
}

export async function attachTutorCategories(tutors) {
  if (!tutors.length) return tutors;
  const ids = tutors.map((tutor) => tutor.tutor_id);
  const [rows] = await pool.query(
    'SELECT tc.tutor_id, c.id, c.name, c.slug FROM tutor_categories tc JOIN categories c ON c.id = tc.category_id WHERE tc.tutor_id IN (?) ORDER BY c.id',
    [ids]
  );
  const byTutor = new Map();
  for (const row of rows) {
    if (!byTutor.has(row.tutor_id)) byTutor.set(row.tutor_id, []);
    byTutor.get(row.tutor_id).push({ id: row.id, name: row.name, slug: row.slug });
  }
  return tutors.map((tutor) => ({ ...tutor, categories: byTutor.get(tutor.tutor_id) || [] }));
}

