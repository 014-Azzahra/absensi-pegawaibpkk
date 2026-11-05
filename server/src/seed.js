const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const cfg = require('./config');

const FILE_PEGAWAI = path.join(__dirname, '..', 'seed', 'pegawai.json');

/** Mengisi akun admin & 30 pegawai contoh jika tabel users masih kosong. Aman dijalankan berulang. */
function jalankanSeed() {
  const ada = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (ada > 0) return false;

  const ins = db.prepare(`INSERT INTO users (kode, nama, jabatan, username, password_hash, role) VALUES (?,?,?,?,?,?)`);
  const hashAdmin = bcrypt.hashSync(cfg.ADMIN_PASSWORD, 10);
  const hashPegawai = bcrypt.hashSync(cfg.PEGAWAI_PASSWORD_AWAL, 10);
  const pegawai = JSON.parse(fs.readFileSync(FILE_PEGAWAI, 'utf8'));

  db.exec('BEGIN');
  try {
    ins.run(null, 'Administrator', 'Admin BPKK', cfg.ADMIN_USERNAME.toLowerCase(), hashAdmin, 'admin');
    for (const p of pegawai) ins.run(p.id, p.nama, p.jabatan, p.id.toLowerCase(), hashPegawai, 'pegawai');
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  console.log(`[seed] admin "${cfg.ADMIN_USERNAME}" + ${pegawai.length} pegawai dibuat (username = ID pegawai, mis. ppnpn001).`);
  return true;
}

module.exports = { jalankanSeed };
if (require.main === module) { if (!jalankanSeed()) console.log('[seed] Database sudah berisi data, dilewati.'); }
