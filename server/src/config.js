const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const ROOT_DIR = path.join(__dirname, '..');           // folder server/
const DATA_DIR = path.join(ROOT_DIR, 'data');
const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(ROOT_DIR, 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Secret JWT: dari .env, atau dibuat otomatis & disimpan agar token tidak invalid tiap restart.
function ambilJwtSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const file = path.join(DATA_DIR, 'jwt.secret');
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, require('crypto').randomBytes(48).toString('hex'), { mode: 0o600 });
  }
  return fs.readFileSync(file, 'utf8').trim();
}

module.exports = {
  PORT: Number(process.env.PORT) || 3000,
  DB_FILE: process.env.DB_FILE || path.join(DATA_DIR, 'absensi.db'),
  UPLOAD_DIR,
  FRONTEND_DIR: path.join(ROOT_DIR, '..'),             // folder root repo (index.html, css/, js/, ...)
  JWT_SECRET: ambilJwtSecret(),
  JWT_EXPIRES: process.env.JWT_EXPIRES || '12h',

  // Aturan presensi (divalidasi ulang di server)
  KANTOR: {
    lat: Number(process.env.KANTOR_LAT) || -3.971464128431429,
    lon: Number(process.env.KANTOR_LON) || 122.51444925176875,
  },
  RADIUS_METER: Number(process.env.RADIUS_METER) || 500,
  JAM_MASUK: process.env.JAM_MASUK || '08:00',            // jam kerja (ditampilkan ke pegawai)
  JAM_PULANG: process.env.JAM_PULANG || '16:00',
  BATAS_TERLAMBAT: process.env.BATAS_TERLAMBAT || '08:30',
  ZONA_WAKTU: process.env.ZONA_WAKTU || 'Asia/Makassar',  // WITA (Kendari)
  MAX_FOTO_BYTES: 5 * 1024 * 1024,

  // Akun awal (seed)
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  PEGAWAI_PASSWORD_AWAL: process.env.PEGAWAI_PASSWORD_AWAL || 'pegawai123',

  // Opsional: sinkronisasi ke Google Sheets via Apps Script Web App
  SHEETS_WEBHOOK_URL: process.env.SHEETS_WEBHOOK_URL || '',
};
