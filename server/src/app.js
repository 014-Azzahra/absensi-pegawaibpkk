const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const cfg = require('./config');
require('./db');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use(cors());                       // izinkan frontend dari Live Server (port lain) saat development
app.use(express.json({ limit: '100kb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

/* ---------- API ---------- */
app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
// Pengaturan publik (bukan rahasia): dipakai frontend agar radius/jam kerja tidak ditulis ganda di kode klien.
app.get('/api/konfigurasi', (_req, res) => res.json(require('./services/pengaturan').ambil()));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/foto', require('./routes/foto'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/absensi'));          // /api/profil, /api/absensi/*
app.use('/api', (_req, res) => res.status(404).json({ pesan: 'Endpoint tidak ditemukan.' }));

/* ---------- Frontend statis (hanya folder & halaman yang diizinkan) ---------- */
const F = cfg.FRONTEND_DIR;
['css', 'img', 'js'].forEach((d) => app.use(`/${d}`, express.static(path.join(F, d))));
const HALAMAN = ['index', 'pegawai', 'admin', 'loginadmin', 'lupasandi'];
HALAMAN.forEach((h) => app.get(`/${h}.html`, (_req, res) => res.sendFile(path.join(F, `${h}.html`))));
app.get('/', (_req, res) => res.sendFile(path.join(F, 'index.html')));

/* ---------- Penanganan error ---------- */
app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    const pesan = err.code === 'LIMIT_FILE_SIZE' ? 'Ukuran foto maksimal 5 MB.' : 'Upload foto gagal.';
    return res.status(err.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ pesan });
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ pesan: 'Format JSON tidak valid.' });
  if (err.status) return res.status(err.status).json({ pesan: err.message });
  console.error(err);
  res.status(500).json({ pesan: 'Terjadi kesalahan pada server.' });
});

if (require.main === module) {
  require('./seed').jalankanSeed();
  app.listen(cfg.PORT, () => console.log(`Server berjalan di http://localhost:${cfg.PORT}`));
}
module.exports = app;
