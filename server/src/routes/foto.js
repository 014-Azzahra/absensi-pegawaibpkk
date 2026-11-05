const express = require('express');
const path = require('path');
const fs = require('fs');
const { UPLOAD_DIR } = require('../config');
const { wajibLogin } = require('../middleware/auth');
const { HttpError } = require('../utils/errors');

const router = express.Router();
const POLA = /^u(\d+)_\d{4}-\d{2}-\d{2}_(masuk|pulang)_[a-f0-9]{12}\.(jpg|png|webp)$/;

// GET /api/foto/:nama  -> admin: semua foto; pegawai: hanya foto miliknya.
router.get('/:nama', wajibLogin, (req, res, next) => {
  const m = POLA.exec(req.params.nama);
  if (!m) return next(new HttpError(404, 'Foto tidak ditemukan.'));
  if (req.user.role !== 'admin' && Number(m[1]) !== req.user.id) return next(new HttpError(403, 'Anda tidak berhak melihat foto ini.'));
  const file = path.join(UPLOAD_DIR, path.basename(req.params.nama));
  if (!fs.existsSync(file)) return next(new HttpError(404, 'Foto tidak ditemukan.'));
  res.setHeader('Cache-Control', 'private, max-age=3600');
  res.sendFile(file);
});

module.exports = router;
