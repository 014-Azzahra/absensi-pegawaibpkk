const express = require('express');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const db = require('../db');
const { wajibLogin, wajibPeran } = require('../middleware/auth');
const { bad, conflict, notFound } = require('../utils/errors');
const { sekarang, bulanValid, tanggalValid } = require('../utils/waktu');
const { hapusFoto } = require('../utils/foto');
const { rekapBulan, formatAbsensi, SELECT_ABSENSI } = require('../services/rekap');
const pengaturan = require('../services/pengaturan');

const router = express.Router();
router.use(wajibLogin, wajibPeran('admin'));

const bulanDariQuery = (q) => {
  const bulan = q.bulan || sekarang().tanggal.slice(0, 7);
  if (!bulanValid(bulan)) throw bad('Format bulan harus YYYY-MM.');
  return bulan;
};

/* ---------------- DASHBOARD ---------------- */
// GET /api/admin/dashboard?bulan=YYYY-MM
router.get('/dashboard', (req, res, next) => {
  try {
    const bulan = bulanDariQuery(req.query);
    const { total, hariKerja } = rekapBulan(bulan);
    const terbaru = db.prepare(`${SELECT_ABSENSI} ORDER BY a.id DESC LIMIT 5`).all().map(formatAbsensi);
    res.json({ bulan, hariKerja, total, terbaru });
  } catch (e) { next(e); }
});

/* ---------------- PENGATURAN PRESENSI ---------------- */
// GET /api/admin/pengaturan  |  PUT /api/admin/pengaturan {lat, lon, radiusMeter, jamMasuk, jamPulang, batasTerlambat}
router.get('/pengaturan', (_req, res) => res.json(pengaturan.ambil()));
router.put('/pengaturan', (req, res, next) => {
  try { res.json(pengaturan.simpan(req.body || {})); } catch (e) { next(e); }
});

/* ---------------- CRUD PEGAWAI ---------------- */
const PEGAWAI_COLS = 'id, kode, nama, jabatan, username, aktif, created_at';

// GET /api/admin/pegawai
router.get('/pegawai', (_req, res) => {
  res.json({ data: db.prepare(`SELECT ${PEGAWAI_COLS} FROM users WHERE role='pegawai' ORDER BY kode, nama`).all() });
});

// GET /api/admin/pegawai/:id
router.get('/pegawai/:id', (req, res, next) => {
  try {
    const p = db.prepare(`SELECT ${PEGAWAI_COLS} FROM users WHERE id=? AND role='pegawai'`).get(req.params.id);
    if (!p) throw notFound('Pegawai tidak ditemukan.');
    res.json(p);
  } catch (e) { next(e); }
});

function bacaFormPegawai(b, wajibPassword) {
  const kode = String(b.kode || '').trim().toUpperCase();
  const nama = String(b.nama || '').trim();
  const jabatan = String(b.jabatan || '').trim();
  const username = String(b.username || '').trim().toLowerCase();
  const password = String(b.password || '');
  if (!kode || !nama || !jabatan || !username) throw bad('ID, nama, jabatan, dan username wajib diisi.');
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw bad('Username 3-30 karakter: huruf kecil, angka, titik, strip, atau underscore.');
  if ((wajibPassword || password) && password.length < 6) throw bad('Kata sandi minimal 6 karakter.');
  return { kode, nama, jabatan, username, password };
}

// POST /api/admin/pegawai
router.post('/pegawai', (req, res, next) => {
  try {
    const f = bacaFormPegawai(req.body, true);
    if (db.prepare('SELECT 1 FROM users WHERE lower(username)=? OR kode=?').get(f.username, f.kode)) {
      throw conflict('Username atau ID pegawai sudah digunakan.');
    }
    const info = db.prepare(`INSERT INTO users (kode, nama, jabatan, username, password_hash, role) VALUES (?,?,?,?,?, 'pegawai')`)
      .run(f.kode, f.nama, f.jabatan, f.username, bcrypt.hashSync(f.password, 10));
    res.status(201).json(db.prepare(`SELECT ${PEGAWAI_COLS} FROM users WHERE id=?`).get(info.lastInsertRowid));
  } catch (e) { next(e); }
});

// PUT /api/admin/pegawai/:id   (password opsional = reset password)
router.put('/pegawai/:id', (req, res, next) => {
  try {
    const lama = db.prepare("SELECT * FROM users WHERE id=? AND role='pegawai'").get(req.params.id);
    if (!lama) throw notFound('Pegawai tidak ditemukan.');
    const f = bacaFormPegawai({ ...lama, ...req.body, password: req.body.password || '' }, false);
    const bentrok = db.prepare('SELECT 1 FROM users WHERE (lower(username)=? OR kode=?) AND id<>?').get(f.username, f.kode, lama.id);
    if (bentrok) throw conflict('Username atau ID pegawai sudah digunakan.');
    const aktif = req.body.aktif === undefined ? lama.aktif : (req.body.aktif ? 1 : 0);
    const hash = f.password ? bcrypt.hashSync(f.password, 10) : lama.password_hash;
    db.prepare('UPDATE users SET kode=?, nama=?, jabatan=?, username=?, password_hash=?, aktif=? WHERE id=?')
      .run(f.kode, f.nama, f.jabatan, f.username, hash, aktif, lama.id);
    res.json(db.prepare(`SELECT ${PEGAWAI_COLS} FROM users WHERE id=?`).get(lama.id));
  } catch (e) { next(e); }
});

// DELETE /api/admin/pegawai/:id  (riwayat absensi ikut terhapus)
router.delete('/pegawai/:id', (req, res, next) => {
  try {
    const p = db.prepare("SELECT id FROM users WHERE id=? AND role='pegawai'").get(req.params.id);
    if (!p) throw notFound('Pegawai tidak ditemukan.');
    const fotos = db.prepare('SELECT foto_masuk, foto_pulang FROM absensi WHERE user_id=?').all(p.id);
    db.prepare('DELETE FROM users WHERE id=?').run(p.id);        // absensi terhapus via ON DELETE CASCADE
    fotos.forEach((f) => { hapusFoto(f.foto_masuk); hapusFoto(f.foto_pulang); });
    res.json({ pesan: 'Akun pegawai dihapus.' });
  } catch (e) { next(e); }
});

/* ---------------- DATA ABSENSI ---------------- */
// GET /api/admin/absensi?tanggal=YYYY-MM-DD   atau   ?bulan=YYYY-MM
router.get('/absensi', (req, res, next) => {
  try {
    let rows;
    if (req.query.tanggal) {
      if (!tanggalValid(req.query.tanggal)) throw bad('Format tanggal harus YYYY-MM-DD.');
      rows = db.prepare(`${SELECT_ABSENSI} WHERE a.tanggal = ? ORDER BY u.nama`).all(req.query.tanggal);
    } else {
      const bulan = bulanDariQuery(req.query);
      rows = db.prepare(`${SELECT_ABSENSI} WHERE a.tanggal LIKE ? ORDER BY a.tanggal, u.nama`).all(`${bulan}-%`);
    }
    res.json({ data: rows.map(formatAbsensi) });
  } catch (e) { next(e); }
});

// DELETE /api/admin/absensi/:id
router.delete('/absensi/:id', (req, res, next) => {
  try {
    const r = db.prepare('SELECT * FROM absensi WHERE id=?').get(req.params.id);
    if (!r) throw notFound('Data absensi tidak ditemukan.');
    db.prepare('DELETE FROM absensi WHERE id=?').run(r.id);
    hapusFoto(r.foto_masuk); hapusFoto(r.foto_pulang);
    res.json({ pesan: 'Data absensi dihapus.' });
  } catch (e) { next(e); }
});

/* ---------------- REKAP BULANAN SELURUH PEGAWAI ---------------- */
// GET /api/admin/rekap?bulan=YYYY-MM
router.get('/rekap', (req, res, next) => {
  try { res.json(rekapBulan(bulanDariQuery(req.query))); } catch (e) { next(e); }
});

/* ---------------- EKSPOR CSV / EXCEL ---------------- */
// Cegah CSV/Excel injection: sel yang diawali = + - @ dianggap rumus oleh Excel.
const aman = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
};
const csvSel = (v) => `"${aman(v).replace(/"/g, '""')}"`;
const toCsv = (header, baris) =>
  '\uFEFF' + [header, ...baris].map((r) => r.map(csvSel).join(';')).join('\r\n');   // BOM + ';' agar rapi di Excel Indonesia

const labelStatus = (r) => (r.statusWaktu === 'terlambat' ? 'Terlambat' : r.status.charAt(0).toUpperCase() + r.status.slice(1));
const HEADER_DETAIL = ['Tanggal', 'ID', 'Nama', 'Jabatan', 'Status', 'Jam Masuk', 'Jam Pulang', 'Jarak Masuk (m)', 'Jarak Pulang (m)', 'Alasan', 'Kegiatan'];
const barisDetail = (rows) => rows.map((r) => [r.tanggal, r.kode, r.nama, r.jabatan, labelStatus(r), r.jamMasuk || '', r.jamPulang || '',
  r.jarakMasuk ?? '', r.jarakPulang ?? '', r.alasan, r.kegiatan]);
const HEADER_RINGKAS = ['ID', 'Nama', 'Jabatan', 'Hadir', 'Terlambat', 'Izin', 'Sakit', 'Cuti', 'Tanpa Keterangan'];
const barisRingkas = (rk) => rk.pegawai.map((p) => [p.kode, p.nama, p.jabatan, p.hadir, p.terlambat, p.izin, p.sakit, p.cuti, p.tanpaKeterangan]);

// GET /api/admin/rekap/export?bulan=YYYY-MM&format=csv|xlsx&jenis=detail|ringkasan
router.get('/rekap/export', async (req, res, next) => {
  try {
    const bulan = bulanDariQuery(req.query);
    const format = req.query.format === 'xlsx' ? 'xlsx' : 'csv';
    const jenis = req.query.jenis === 'ringkasan' ? 'ringkasan' : 'detail';
    const rows = db.prepare(`${SELECT_ABSENSI} WHERE a.tanggal LIKE ? ORDER BY a.tanggal, u.nama`).all(`${bulan}-%`).map(formatAbsensi);
    const rk = rekapBulan(bulan);

    if (format === 'csv') {
      const csv = jenis === 'ringkasan' ? toCsv(HEADER_RINGKAS, barisRingkas(rk)) : toCsv(HEADER_DETAIL, barisDetail(rows));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="rekap-${jenis}-${bulan}.csv"`);
      return res.send(csv);
    }

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Presensi PPNPN BPKK Kendari';
    const buatSheet = (nama, header, baris, lebar) => {
      const ws = wb.addWorksheet(nama);
      ws.addRow(header).font = { bold: true };
      baris.forEach((b) => ws.addRow(b.map((v) => (typeof v === 'string' ? aman(v) : v))));
      ws.columns.forEach((c, i) => { c.width = lebar[i] || 14; });
      ws.views = [{ state: 'frozen', ySplit: 1 }];
    };
    buatSheet('Rekap Bulanan', HEADER_RINGKAS, barisRingkas(rk), [12, 26, 24, 8, 11, 8, 8, 8, 18]);
    buatSheet('Detail Harian', HEADER_DETAIL, barisDetail(rows), [12, 12, 26, 24, 12, 11, 11, 15, 15, 30, 50]);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="rekap-absensi-${bulan}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (e) { next(e); }
});

module.exports = router;
