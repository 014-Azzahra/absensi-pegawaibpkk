// SQLite bawaan Node.js (node:sqlite, Node >= 22.5) -> tidak perlu kompilasi C++/Visual Studio.
const { DatabaseSync } = require('node:sqlite');
const { DB_FILE } = require('./config');

const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  kode          TEXT UNIQUE,                      -- ID pegawai, mis. PPNPN001 (admin: NULL)
  nama          TEXT NOT NULL,
  jabatan       TEXT NOT NULL DEFAULT '',
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','pegawai')),
  aktif         INTEGER NOT NULL DEFAULT 1,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS absensi (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tanggal       TEXT NOT NULL,                    -- YYYY-MM-DD (zona waktu kantor)
  status        TEXT NOT NULL CHECK (status IN ('hadir','izin','sakit','cuti')),
  status_waktu  TEXT NOT NULL,                    -- hadir | terlambat | izin | sakit | cuti
  jam_masuk     TEXT,
  jam_pulang    TEXT,
  alasan        TEXT NOT NULL DEFAULT '',
  kegiatan      TEXT NOT NULL DEFAULT '',
  foto_masuk    TEXT,                             -- nama file di folder uploads/
  foto_pulang   TEXT,
  lat_masuk     REAL, lon_masuk  REAL, jarak_masuk  REAL,
  lat_pulang    REAL, lon_pulang REAL, jarak_pulang REAL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, tanggal)
);
CREATE TABLE IF NOT EXISTS pengaturan (
  kunci TEXT PRIMARY KEY,
  nilai TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_absensi_tanggal ON absensi(tanggal);
`);

module.exports = db;
