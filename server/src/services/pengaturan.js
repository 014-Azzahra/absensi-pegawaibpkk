const db = require('../db');
const cfg = require('../config');
const { bad } = require('../utils/errors');

/**
 * Pengaturan presensi yang bisa diubah admin dari panel (disimpan di tabel `pengaturan`).
 * Jika admin belum pernah mengubah, nilai bawaan diambil dari .env / config.js.
 */
const BAWAAN = () => ({
  lat: cfg.KANTOR.lat, lon: cfg.KANTOR.lon, radiusMeter: cfg.RADIUS_METER,
  jamMasuk: cfg.JAM_MASUK, jamPulang: cfg.JAM_PULANG, batasTerlambat: cfg.BATAS_TERLAMBAT,
});
const JAM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function ambil() {
  const nilai = BAWAAN();
  for (const r of db.prepare('SELECT kunci, nilai FROM pengaturan').all()) {
    if (r.kunci in nilai) nilai[r.kunci] = typeof nilai[r.kunci] === 'number' ? Number(r.nilai) : r.nilai;
  }
  return {
    kantor: { lat: nilai.lat, lon: nilai.lon }, radiusMeter: nilai.radiusMeter,
    jamMasuk: nilai.jamMasuk, jamPulang: nilai.jamPulang, batasTerlambat: nilai.batasTerlambat,
    zonaWaktu: cfg.ZONA_WAKTU,
  };
}

/** Validasi lalu simpan. Mengembalikan pengaturan terbaru. */
function simpan(input) {
  const lat = Number(input.lat), lon = Number(input.lon), radius = Number(input.radiusMeter);
  const { jamMasuk, jamPulang, batasTerlambat } = input;
  if (input.lat === '' || input.lon === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) throw bad('Latitude harus angka antara -90 dan 90.');
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) throw bad('Longitude harus angka antara -180 dan 180.');
  if (!Number.isInteger(radius) || radius < 10 || radius > 5000) throw bad('Radius harus bilangan bulat 10-5000 meter.');
  for (const [nama, v] of [['Jam masuk', jamMasuk], ['Jam pulang', jamPulang], ['Batas terlambat', batasTerlambat]]) {
    if (!JAM_RE.test(String(v))) throw bad(`${nama} harus berformat HH:MM (mis. 08:00).`);
  }
  if (jamMasuk >= jamPulang) throw bad('Jam pulang harus setelah jam masuk.');
  if (batasTerlambat < jamMasuk || batasTerlambat >= jamPulang) throw bad('Batas terlambat harus di antara jam masuk dan jam pulang.');

  const up = db.prepare('INSERT INTO pengaturan (kunci, nilai) VALUES (?, ?) ON CONFLICT(kunci) DO UPDATE SET nilai = excluded.nilai');
  db.exec('BEGIN');
  try {
    for (const [k, v] of Object.entries({ lat, lon, radiusMeter: radius, jamMasuk, jamPulang, batasTerlambat })) up.run(k, String(v));
    db.exec('COMMIT');
  } catch (e) { db.exec('ROLLBACK'); throw e; }
  return ambil();
}

module.exports = { ambil, simpan };
