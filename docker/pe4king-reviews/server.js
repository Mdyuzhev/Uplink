'use strict';

const express  = require('express');
const { Pool } = require('pg');
const multer   = require('multer');
const cors     = require('cors');
const { v4: uuidv4 } = require('uuid');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = 3002;

// ── CORS — разрешаем только с GitHub Pages и localhost ───────────────────
app.use(cors({
  origin: [
    'https://mdyuzhev.github.io',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:8080',
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '1mb' }));

// ── PostgreSQL ───────────────────────────────────────────────────────────
const pool = new Pool({
  host:     process.env.POSTGRES_HOST     || 'postgres',
  port:     parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB       || 'uplink',
  user:     process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
});

// ── Директория для загружаемых изображений ───────────────────────────────
const UPLOADS_DIR = '/app/uploads';
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ── Multer — загрузка картинок (макс 5MB, только изображения) ────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// ── Init DB ──────────────────────────────────────────────────────────────
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pe4king_reviews (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL DEFAULT 'Тестировщик',
      rating     SMALLINT     NOT NULL CHECK (rating BETWEEN 1 AND 5),
      text       TEXT         NOT NULL,
      image_url  TEXT,
      created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
  `);
  console.log('[pe4king-reviews] DB table ready');
}

// ── Routes ───────────────────────────────────────────────────────────────

// GET /health
app.get('/health', (req, res) => res.json({ ok: true }));

// GET /reviews — все отзывы (новые первыми)
app.get('/reviews', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, rating, text, image_url, created_at FROM pe4king_reviews ORDER BY created_at DESC LIMIT 200'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /reviews]', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

// POST /reviews — создать отзыв (multipart/form-data)
app.post('/reviews', upload.single('image'), async (req, res) => {
  try {
    const { name, rating, text } = req.body;

    // Валидация
    if (!text || text.trim().length < 3) {
      return res.status(400).json({ error: 'Отзыв слишком короткий' });
    }
    const r = parseInt(rating);
    if (!r || r < 1 || r > 5) {
      return res.status(400).json({ error: 'Оценка должна быть от 1 до 5' });
    }

    // URL загруженного изображения
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/pe4king-api/uploads/${req.file.filename}`;
    }

    const result = await pool.query(
      `INSERT INTO pe4king_reviews (name, rating, text, image_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, rating, text, image_url, created_at`,
      [
        (name || 'Тестировщик').trim().slice(0, 100),
        r,
        text.trim().slice(0, 2000),
        imageUrl,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /reviews]', err.message);
    res.status(500).json({ error: 'DB error' });
  }
});

// GET /uploads/:filename — отдаём загруженные картинки
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Start ────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[pe4king-reviews] Listening on :${PORT}`);
    });
  })
  .catch(err => {
    console.error('[pe4king-reviews] Fatal:', err);
    process.exit(1);
  });
