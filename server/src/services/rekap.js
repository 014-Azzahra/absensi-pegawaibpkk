const db = require('../db');
const { hariKerjaBulan } = require('../utils/waktu');

/**
 * Hitung rekap satu bulan per pegawai.
 * - hadir      : jumlah hari status 'hadir' (termasuk yang terlambat)
 * - terlambat  : subset dari hadir yang masuk setelah batas jam
 * - tanpaKet   : hari kerja (Sen-Jum, sampai hari ini) yang tidak punya catatan sama sekali
 */
function rekapBulan(bulan, userId = null) {
  const hariKerja = hariKerjaBulan(bulan);
  const pegawai = userId
    ? db.prepare("SELECT id, kode, nama, jabatan FROM users WHERE id = ? AND role='pegawai'").all(userId)
    : db.prepare("SELECT id, kode, nama, jabatan FROM users WHERE role='pegawai' AND aktif=1 ORDER BY kode, nama").all();

  const baris = db.prepare(`SELECT user_id, tanggal, status, status_waktu FROM absensi WHERE tanggal LIKE ?`).all(`${bulan}-%`);
  const perUser = new Map();
  for (const r of baris) {
    if (!perUser.has(r.user_id)) perUser.set(r.user_id, []);
    perUser.get(r.user_id).push(r);
  }

  const hasil = pegawai.map((p) => {
    const data = perUser.get(p.id) || [];
    const tanggalAda = new Set(data.map((d) => d.tanggal));
    const hitung = (fn) => data.filter(fn).length;
    return {
      id: p.id, kode: p.kode, nama: p.nama, jabatan: p.jabatan,
      hadir: hitung((d) => d.status === 'hadir'),
      terlambat: hitung((d) => d.status_waktu === 'terlambat'),
      izin: hitung((d) => d.status === 'izin'),
      sakit: hitung((d) => d.status === 'sakit'),
      cuti: hitung((d) => d.status === 'cuti'),
      tanpaKeterangan: hariKerja.filter((t) => !tanggalAda.has(t)).length,
    };
  });

  const total = hasil.reduce((t, r) => {
    for (const k of ['hadir', 'terlambat', 'izin', 'sakit', 'cuti', 'tanpaKeterangan']) t[k] += r[k];
    return t;
  }, { hadir: 0, terlambat: 0, izin: 0, sakit: 0, cuti: 0, tanpaKeterangan: 0 });

  return { bulan, hariKerja: hariKerja.length, pegawai: hasil, total };
}

/** Bentuk baris absensi untuk dikirim ke klien (camelCase, tanpa path server). */
function formatAbsensi(r) {
  return {
    id: r.id,
    pegawaiId: r.user_id,
    kode: r.kode, nama: r.nama, jabatan: r.jabatan,
    tanggal: r.tanggal, status: r.status, statusWaktu: r.status_waktu,
    jamMasuk: r.jam_masuk, jamPulang: r.jam_pulang,
    alasan: r.alasan, kegiatan: r.kegiatan,
    fotoMasuk: r.foto_masuk, fotoPulang: r.foto_pulang,
    jarakMasuk: r.jarak_masuk, jarakPulang: r.jarak_pulang,
  };
}

const SELECT_ABSENSI = `
  SELECT a.*, u.kode, u.nama, u.jabatan
  FROM absensi a JOIN users u ON u.id = a.user_id`;

module.exports = { rekapBulan, formatAbsensi, SELECT_ABSENSI };
