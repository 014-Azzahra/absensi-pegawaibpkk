const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');
const { buatToken } = require('../middleware/auth');
const { HttpError, bad } = require('../utils/errors');

const router = express.Router();

// Pembatas percobaan login sederhana (in-memory): 8 kali gagal / 10 menit per IP+username.
const gagal = new Map();
const BATAS = 8, JENDELA_MS = 10 * 60 * 1000;
function cekBatas(kunci) {
  const e = gagal.get(kunci);
  if (e && Date.now() - e.mulai > JENDELA_MS) gagal.delete(kunci);
  return (gagal.get(kunci)?.n || 0) >= BATAS;
}
function catatGagal(kunci) {
  const e = gagal.get(kunci) || { n: 0, mulai: Date.now() };
  e.n++; gagal.set(kunci, e);
}

// hash dummy agar waktu respons sama baik user ada maupun tidak (cegah user enumeration)
const HASH_DUMMY = bcrypt.hashSync('dummy-password', 10);

// POST /api/auth/login  { username, password }
router.post('/login', (req, res, next) => {
  try {
    const username = String(req.body.username || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (!username || !password) throw bad('Username dan kata sandi wajib diisi.');

    const kunci = `${req.ip}|${username}`;
    if (cekBatas(kunci)) throw new HttpError(429, 'Terlalu banyak percobaan gagal. Coba lagi dalam beberapa menit.');

    // Pegawai boleh login memakai username atau ID (mis. PPNPN001)
    const user = db.prepare('SELECT * FROM users WHERE lower(username) = ? OR lower(kode) = ?').get(username, username);
    const cocok = bcrypt.compareSync(password, user ? user.password_hash : HASH_DUMMY);
    if (!user || !cocok || !user.aktif) {
      catatGagal(kunci);
      throw new HttpError(401, 'Username atau kata sandi salah.');
    }
    gagal.delete(kunci);
    res.json({
      token: buatToken(user),
      user: { id: user.id, kode: user.kode, nama: user.nama, jabatan: user.jabatan, username: user.username, role: user.role },
    });
  } catch (e) { next(e); }
});

module.exports = router;
