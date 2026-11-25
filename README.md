# Studeas Backend

REST API Node.js (Express) dengan MySQL. Semua respons memakai JSON. Database yang dipakai adalah `studeas_4`.

## Menjalankan

1. Pastikan Node.js 20+ dan MySQL 8.0.16+ tersedia.
2. Impor [`../studeas.sql`](../studeas.sql) melalui phpMyAdmin. File ini membuat database `studeas_4` beserta tabel, kategori, dan view.
3. Salin `.env.example` menjadi `.env`, lalu isi koneksi MySQL dan `JWT_SECRET` acak minimal 32 karakter.
4. Jalankan `npm install` dan `npm run dev` (atau `npm start`).
5. Jalankan `npm run create-admin` di terminal interaktif untuk membuat akun admin pertama. Password dimasukkan tanpa ditampilkan dan disimpan sebagai hash bcrypt.

Registrasi publik hanya membuat akun `user`. Login admin dan user memakai endpoint yang sama. Respons login berisi `role`; gunakan nilai itu untuk memilih halaman admin atau halaman user di frontend. Semua endpoint yang membutuhkan login memakai header `Authorization: Bearer <token>`.

Saat `NODE_ENV` bukan `production`, backend menerima origin `http://localhost` dan `http://127.0.0.1` dengan port berapa pun untuk Flutter web. Origin lain harus dicantumkan di `CORS_ORIGIN`, dipisahkan dengan koma. Setelah mengubah konfigurasi atau kode backend, jalankan ulang server jika memakai `npm start`.

## Endpoint

| Metode | URL | Fungsi | Login |
| --- | --- | --- | --- |
| GET | `/api/health` | Cek koneksi API dan database | Tidak |
| POST | `/api/auth/register` | Daftar user | Tidak |
| POST | `/api/auth/login` | Login user/admin | Tidak |
| GET | `/api/categories` | Pilihan bidang/kategori | Tidak |
| GET | `/api/home` | 5 tutor aktif dan 5 catatan teratas | Tidak |
| GET | `/api/me` | Profil user dan status tutor sendiri | Ya |
| PATCH | `/api/me` | Ubah nama, bio, foto profil | Ya |
| GET | `/api/tutors` | Daftar/search/filter tutor | Tidak |
| GET | `/api/tutors/:id` | Detail tutor publik | Tidak |
| POST | `/api/tutors/apply` | Ajukan diri sebagai tutor; boleh ajukan ulang setelah ditolak | Ya |
| PUT | `/api/tutors/me` | Ubah data tutor sendiri | Ya |
| PATCH | `/api/tutors/me/status` | Ubah `active`/`inactive` setelah disetujui | Ya |
| PUT | `/api/tutors/:id/rating` | Beri atau perbarui rating tutor aktif | Ya |
| GET | `/api/notes` | Daftar/filter catatan | Tidak |
| GET | `/api/notes/:id` | Detail catatan | Tidak |
| POST | `/api/notes` | Buat catatan | Ya |
| PUT | `/api/notes/:id` | Ubah catatan sendiri | Ya |
| DELETE | `/api/notes/:id` | Hapus catatan sendiri | Ya |
| PUT | `/api/notes/:id/rating` | Beri atau perbarui rating catatan | Ya |
| GET | `/api/admin/tutors/pending` | Daftar pengajuan tutor | Admin |
| PATCH | `/api/admin/tutors/:id/decision` | Setujui/tolak pengajuan | Admin |

`GET /api/tutors` menerima `name`, `category_id`, `sort=newest|rating|rating_count`, `page`, dan `limit` (maksimal 100). `sort=newest` menampilkan tutor aktif dan tidak aktif. `sort=rating` atau `rating_count` hanya menampilkan tutor aktif. Pengajuan `pending` dan `rejected` tidak ditampilkan di direktori publik.

`GET /api/notes` menerima `category_id`, `sort=newest|rating|rating_count`, `page`, dan `limit`. Rating bernilai bilangan bulat 1–5; satu akun hanya dapat memberi satu rating per tutor atau catatan, tetapi dapat memperbaruinya.

## Contoh body JSON

```json
POST /api/auth/register
{"username":"alif","full_name":"Alif","email":"alif@example.com","password":"password-kuat"}

POST /api/auth/login
{"username":"alif","password":"password-kuat"}

POST /api/tutors/apply
{"category_ids":[1,2],"cv_text":"Pengalaman mengajar...","cv_link":"https://example.com/cv","skills_text":"Manajemen proyek dan web","skills_link":"https://example.com/portofolio","contact_phone":"081234567890"}

POST /api/notes
{"category_id":2,"title":"Dasar HTML","content_text":"Ringkasan materi...","content_link":"https://example.com/materi"}

PUT /api/tutors/1/rating
{"rating":5,"review_text":"Penjelasannya jelas"}

PATCH /api/admin/tutors/1/decision
{"decision":"reject","reason":"CV belum dapat diakses"}
```

Untuk menyetujui pengajuan, kirim `{"decision":"approve"}`. Kategori bawaan: `1` Project Management, `2` WEB Programming, dan `3` Mobile Programming. Pengajuan tutor harus memiliki `cv_text` atau `cv_link`; catatan harus memiliki `content_text` atau `content_link`. Field link menerima URL `http`/`https`.

## Struktur kode

- `src/server.js`: menjalankan server dan mengecek koneksi database.
- `src/app.js`: konfigurasi Express/CORS dan pemasangan router.
- `src/routes/`: endpoint per fitur (`auth`, `profile`, `tutors`, `notes`, `admin`, `public`).
- `src/middleware/auth.js`: verifikasi JWT dan hak akses admin.
- `src/middleware/errors.js`: respons kesalahan dan endpoint tidak ditemukan.
- `src/services/`: validasi dan pengambilan data pendukung kategori, tutor, dan catatan.
- `src/db.js`: connection pool MySQL.
- `src/utils.js`: validasi umum, pagination, dan pembungkus handler async.

Kontrak endpoint tetap sama sehingga frontend tetap memakai API yang sudah tersedia. Jalankan ulang backend setelah perubahan struktur file ini.
