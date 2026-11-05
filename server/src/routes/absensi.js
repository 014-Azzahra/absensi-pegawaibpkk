const express = require('express');
const multer = require('multer');
const db = require('../db');
const cfg = require('../config');
const { wajibLogin, wajibPeran } = require('../middleware/auth');
const { bad, conflict, unprocessable, notFound } = require('../utils/errors');
const { sekarang, bulanValid } = require('../utils/waktu');
const { hitungJarak } = require('../utils/geo');
const { simpanFoto } = require('../utils/foto');
const { sinkronKeSheets } = require('../utils/sheets');
const { rekapBulan, formatAbsensi, SELECT_ABSENSI } = require('../services/rekap');
const pengaturan = require('../services/pengaturan');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: cfg.MAX_FOTO_BYTES, files: 1 } });
const STATUS_VALID = ['hadir', 'izin', 'sakit', 'cuti'];

router.use(wajibLogin, wajibPeran('pegawai'));

/** Validasi koordinat & radius di SERVER (klien tidak boleh dipercaya begitu saja). */
function validasiLokasi(body) {
  const lat = Number(body.lat), lon = Number(body.lon);
  if (body.lat === undefined || body.lon === undefined || body.lat === '' || body.lon === '' ||
      !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw bad('Lokasi tidak valid. Aktifkan GPS lalu coba lagi.');
  }
  const { kantor, radiusMeter } = pengaturan.ambil();      // dibaca tiap request -> perubahan admin langsung berlaku
  const jarak = hitungJarak(lat, lon, kantor.lat, kantor.lon);
  if (jarak > radiusMeter) {
    throw unprocessable(`Di luar radius kantor. Jarak terukur ${Math.round(jarak)} meter; batas maksimal ${radiusMeter} meter.`);
  }
  return { lat, lon, jarak: Math.round(jarak * 10) / 10 };
}

const absenHariIni = (userId, tanggal) => db.prepare(`${SELECT_ABSENSI} WHERE a.user_id = ? AND a.tanggal = ?`).get(userId, tanggal);

// GET /api/profil
router.get('/profil', (req, res) => {
  const { id, kode, nama, jabatan, username, role } = req.user;
  res.json({ id, kode, nama, jabatan, username, role });
});

// GET /api/absensi/hari-ini
router.get('/absensi/hari-ini', (req, res) => {
  const { tanggal, jam } = sekarang();
  const r = absenHariIni(req.user.id, tanggal);
  res.json({ tanggal, jamServer: jam, absensi: r ? formatAbsensi(r) : null });
});

// POST /api/absensi/masuk  (multipart: status, alasan?, lat, lon, foto)
router.post('/absensi/masuk', upload.single('foto'), (req, res, next) => {
  try {
    const status = String(req.body.status || 'hadir');
    if (!STATUS_VALID.includes(status)) throw bad('Status kehadiran tidak valid.');
    const { tanggal, jam } = sekarang();
    if (absenHariIni(req.user.id, tanggal)) throw conflict('Anda sudah mengisi absensi hari ini.');

    let alasan = '', fotoMasuk = null, lok = null, jamMasuk = null, statusWaktu = status;
    if (status === 'hadir') {
      lok = validasiLokasi(req.body);                       // radius 500 m
      fotoMasuk = simpanFoto(req.file, req.user.id, tanggal, 'masuk');   // foto wajib
      jamMasuk = jam;
      statusWaktu = jam > pengaturan.ambil().batasTerlambat ? 'terlambat' : 'hadir';
    } else {
      alasan = String(req.body.alasan || '').trim();
      if (alasan.length < 3) throw bad('Alasan wajib diisi.');
    }

    const info = db.prepare(`
      INSERT INTO absensi (user_id, tanggal, status, status_waktu, jam_masuk, alasan, foto_masuk, lat_masuk, lon_masuk, jarak_masuk)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(req.user.id, tanggal, status, statusWaktu, jamMasuk, alasan, fotoMasuk, lok?.lat ?? null, lok?.lon ?? null, lok?.jarak ?? null);

    const r = formatAbsensi(db.prepare(`${SELECT_ABSENSI} WHERE a.id = ?`).get(info.lastInsertRowid));
    sinkronKeSheets('masuk', r);
    res.status(201).json({ pesan: `Absensi ${status.toUpperCase()} berhasil${jamMasuk ? ' pukul ' + jamMasuk : ''}.`, absensi: r });
  } catch (e) { next(e); }
});

// PUT /api/absensi/kegiatan  { kegiatan }  -> simpan/ubah kegiatan harian (sebelum absen pulang)
router.put('/absensi/kegiatan', (req, res, next) => {
  try {
    const kegiatan = String(req.body.kegiatan || '').trim();
    if (kegiatan.length < 5) throw bad('Kegiatan minimal 5 karakter.');
    if (kegiatan.length > 2000) throw bad('Kegiatan maksimal 2000 karakter.');
    const { tanggal } = sekarang();
    const r = absenHariIni(req.user.id, tanggal);
    if (!r) throw conflict('Belum absen masuk hari ini.');
    if (r.status !== 'hadir') throw conflict('Kegiatan hanya untuk pegawai yang hadir.');
    if (r.jam_pulang) throw conflict('Absen pulang sudah tercatat; kegiatan tidak dapat diubah.');
    db.prepare('UPDATE absensi SET kegiatan = ? WHERE id = ?').run(kegiatan, r.id);
    res.json({ pesan: 'Kegiatan harian tersimpan.', kegiatan });
  } catch (e) { next(e); }
});

// POST /api/absensi/pulang  (multipart: lat, lon, foto)  -- wajib: radius, foto, kegiatan sudah tersimpan
router.post('/absensi/pulang', upload.single('foto'), (req, res, next) => {
  try {
    const { tanggal, jam } = sekarang();
    const r = absenHariIni(req.user.id, tanggal);
    if (!r) throw conflict('Belum absen masuk hari ini.');
    if (r.status !== 'hadir') throw conflict('Absen pulang tidak berlaku untuk izin/sakit/cuti.');
    if (r.jam_pulang) throw conflict('Absen pulang sudah tercatat.');
    if (!r.kegiatan || r.kegiatan.trim().length < 5) throw unprocessable('Isi dan simpan kegiatan harian terlebih dahulu sebelum absen pulang.');

    const lok = validasiLokasi(req.body);
    const foto = simpanFoto(req.file, req.user.id, tanggal, 'pulang');

    db.prepare(`UPDATE absensi SET jam_pulang=?, foto_pulang=?, lat_pulang=?, lon_pulang=?, jarak_pulang=? WHERE id=?`)
      .run(jam, foto, lok.lat, lok.lon, lok.jarak, r.id);

    const baru = formatAbsensi(db.prepare(`${SELECT_ABSENSI} WHERE a.id = ?`).get(r.id));
    sinkronKeSheets('pulang', baru);
    res.json({ pesan: `Absen pulang berhasil pukul ${jam}.`, absensi: baru });
  } catch (e) { next(e); }
});

// GET /api/absensi/riwayat?bulan=YYYY-MM
router.get('/absensi/riwayat', (req, res, next) => {
  try {
    const bulan = req.query.bulan || sekarang().tanggal.slice(0, 7);
    if (!bulanValid(bulan)) throw bad('Format bulan harus YYYY-MM.');
    const rows = db.prepare(`${SELECT_ABSENSI} WHERE a.user_id = ? AND a.tanggal LIKE ? ORDER BY a.tanggal DESC`).all(req.user.id, `${bulan}-%`);
    res.json({ bulan, data: rows.map(formatAbsensi) });
  } catch (e) { next(e); }
});

// GET /api/absensi/rekap?bulan=YYYY-MM  -> rekap bulanan pribadi
router.get('/absensi/rekap', (req, res, next) => {
  try {
    const bulan = req.query.bulan || sekarang().tanggal.slice(0, 7);
    if (!bulanValid(bulan)) throw bad('Format bulan harus YYYY-MM.');
    const { hariKerja, pegawai } = rekapBulan(bulan, req.user.id);
    const rows = db.prepare(`${SELECT_ABSENSI} WHERE a.user_id = ? AND a.tanggal LIKE ? ORDER BY a.tanggal DESC`).all(req.user.id, `${bulan}-%`);
    res.json({ bulan, hariKerja, rekap: pegawai[0], riwayat: rows.map(formatAbsensi) });
  } catch (e) { next(e); }
});

module.exports = router;
