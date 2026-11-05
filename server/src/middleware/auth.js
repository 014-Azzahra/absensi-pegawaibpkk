const jwt = require('jsonwebtoken');
const db = require('../db');
const { JWT_SECRET, JWT_EXPIRES } = require('../config');
const { HttpError } = require('../utils/errors');

const buatToken = (user) => jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

/** Wajib login. Mengisi req.user dari database (bukan hanya dari isi token). */
function wajibLogin(req, _res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new HttpError(401, 'Silakan login terlebih dahulu.'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, kode, nama, jabatan, username, role, aktif FROM users WHERE id = ?').get(payload.sub);
    if (!user || !user.aktif) return next(new HttpError(401, 'Akun tidak ditemukan atau nonaktif.'));
    req.user = user;
    next();
  } catch {
    next(new HttpError(401, 'Sesi berakhir. Silakan login kembali.'));
  }
}

const wajibPeran = (...peran) => (req, _res, next) =>
  peran.includes(req.user.role) ? next() : next(new HttpError(403, 'Anda tidak berhak mengakses fitur ini.'));

module.exports = { buatToken, wajibLogin, wajibPeran };
