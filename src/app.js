import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errors.js';
import publicRoutes from './routes/public.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import tutorsRoutes from './routes/tutors.js';
import notesRoutes from './routes/notes.js';
import adminRoutes from './routes/admin.js';

export const app = express();
app.use(cors({ origin: (origin, callback) => {
  const configured = (process.env.CORS_ORIGIN || '').split(',').map((value) => value.trim()).filter(Boolean);
  const localFlutter = process.env.NODE_ENV !== 'production'
    && /^http:\/\/(?:localhost|127\.0\.0\.1)(?::\d{1,5})?$/i.test(origin || '');
  callback(null, !!origin && (configured.includes(origin) || localFlutter));
} }));
app.use(express.json({ limit: '1mb' }));
app.use((req, _res, next) => { req.body ??= {}; next(); });

app.use(publicRoutes);
app.use(authRoutes);
app.use(profileRoutes);
app.use(tutorsRoutes);
app.use(notesRoutes);
app.use(adminRoutes);
app.use(notFound);
app.use(errorHandler);
