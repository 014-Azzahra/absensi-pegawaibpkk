/* Tes uji asap: node test/smoke.test.js  (memakai database sementara, tidak menyentuh data asli) */
const os = require('os'), path = require('path'), fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'absensi-'));
process.env.DB_FILE = path.join(tmp, 'test.db');
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
const assert = require('assert');
const app = require('../src/app');
const { jalankanSeed } = require('../src/seed');
const { KANTOR } = require('../src/config');
jalankanSeed();

// JPEG minimal valid (magic bytes cukup untuk validasi server)
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);

(async () => {
  const server = app.listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const req = async (m, url, { token, json, form } = {}) => {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    let body;
    if (json) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
    if (form) body = form;
    const r = await fetch(base + url, { method: m, headers, body });
    const ct = r.headers.get('content-type') || '';
    return { status: r.status, body: ct.includes('json') ? await r.json() : await r.text(), headers: r.headers };
  };
  const formAbsen = (lat, lon, foto = true) => {
    const f = new FormData(); f.append('lat', lat); f.append('lon', lon);
    if (foto) f.append('foto', new Blob([JPEG], { type: 'image/jpeg' }), 'x.jpg');
    return f;
  };
  let n = 0; const ok = (nama) => console.log(`  ✓ ${++n}. ${nama}`);

  // --- Konfigurasi
  const kf = (await req('GET', '/konfigurasi')).body;
  assert(kf.radiusMeter === 500 && kf.kantor.lat && kf.jamMasuk); ok('pengaturan (koordinat kantor, radius, jam kerja) dari konfigurasi');

  // --- Auth
  assert.equal((await req('POST', '/auth/login', { json: { username: 'admin', password: 'salah' } })).status, 401); ok('login salah ditolak');
  const adm = (await req('POST', '/auth/login', { json: { username: 'admin', password: 'admin123' } })).body.token;
  const peg = (await req('POST', '/auth/login', { json: { username: 'ppnpn001', password: 'pegawai123' } })).body.token;
  assert(adm && peg); ok('login admin & pegawai berhasil');
  assert.equal((await req('GET', '/profil')).status, 401); ok('tanpa token ditolak');
  assert.equal((await req('GET', '/admin/pegawai', { token: peg })).status, 403); ok('pegawai tidak bisa akses endpoint admin');
  assert.equal((await req('GET', '/absensi/hari-ini', { token: adm })).status, 403); ok('admin tidak bisa absen');
  assert.equal((await req('GET', '/profil', { token: peg })).body.nama, 'Andi Pratama'); ok('profil karyawan');

  // --- Validasi server
  let r = await req('POST', '/absensi/masuk', { token: peg, form: formAbsen(KANTOR.lat + 0.02, KANTOR.lon) });
  assert.equal(r.status, 422); assert(/radius/i.test(r.body.pesan)); ok('masuk di luar radius 500 m ditolak');
  r = await req('POST', '/absensi/masuk', { token: peg, form: formAbsen(KANTOR.lat, KANTOR.lon, false) });
  assert.equal(r.status, 400); ok('masuk tanpa foto ditolak');
  const palsu = new FormData(); palsu.append('lat', KANTOR.lat); palsu.append('lon', KANTOR.lon);
  palsu.append('foto', new Blob(['<?php echo 1;'], { type: 'image/jpeg' }), 'x.jpg');
  assert.equal((await req('POST', '/absensi/masuk', { token: peg, form: palsu })).status, 400); ok('file non-gambar ditolak');
  r = await req('POST', '/absensi/masuk', { token: peg, form: formAbsen(KANTOR.lat + 0.001, KANTOR.lon) });
  assert.equal(r.status, 201); assert(r.body.absensi.fotoMasuk.startsWith('u2_')); ok('absen masuk berhasil (foto tersimpan di uploads/)');
  assert.equal((await req('POST', '/absensi/masuk', { token: peg, form: formAbsen(KANTOR.lat, KANTOR.lon) })).status, 409); ok('absen masuk ganda ditolak');

  r = await req('POST', '/absensi/pulang', { token: peg, form: formAbsen(KANTOR.lat, KANTOR.lon) });
  assert.equal(r.status, 422); assert(/kegiatan/i.test(r.body.pesan)); ok('pulang tanpa kegiatan ditolak');
  assert.equal((await req('PUT', '/absensi/kegiatan', { token: peg, json: { kegiatan: 'ab' } })).status, 400); ok('kegiatan terlalu pendek ditolak');
  assert.equal((await req('PUT', '/absensi/kegiatan', { token: peg, json: { kegiatan: 'Menyusun laporan bulanan' } })).status, 200); ok('simpan kegiatan harian');
  assert.equal((await req('POST', '/absensi/pulang', { token: peg, form: formAbsen(KANTOR.lat, KANTOR.lon, false) })).status, 400); ok('pulang tanpa foto ditolak');
  assert.equal((await req('POST', '/absensi/pulang', { token: peg, form: formAbsen(KANTOR.lat + 0.02, KANTOR.lon) })).status, 422); ok('pulang di luar radius ditolak');
  r = await req('POST', '/absensi/pulang', { token: peg, form: formAbsen(KANTOR.lat, KANTOR.lon) });
  assert.equal(r.status, 200); assert(r.body.absensi.jamPulang); ok('absen pulang berhasil');
  assert.equal((await req('POST', '/absensi/pulang', { token: peg, form: formAbsen(KANTOR.lat, KANTOR.lon) })).status, 409); ok('pulang ganda ditolak');

  // --- Izin pegawai lain
  const peg2 = (await req('POST', '/auth/login', { json: { username: 'ppnpn002', password: 'pegawai123' } })).body.token;
  const fIzin = new FormData(); fIzin.append('status', 'sakit'); fIzin.append('alasan', 'Demam tinggi');
  assert.equal((await req('POST', '/absensi/masuk', { token: peg2, form: fIzin })).status, 201); ok('pengajuan sakit dengan alasan');

  // --- Riwayat & rekap pegawai
  const bulan = require('../src/utils/waktu').sekarang().tanggal.slice(0, 7);
  r = await req('GET', `/absensi/riwayat?bulan=${bulan}`, { token: peg });
  assert.equal(r.body.data.length, 1); ok('riwayat absensi');
  r = await req('GET', `/absensi/rekap?bulan=${bulan}`, { token: peg });
  assert.equal(r.body.rekap.hadir, 1); ok('rekap bulanan pribadi');
  assert.equal((await req('GET', '/absensi/rekap?bulan=2026-13', { token: peg })).status, 400); ok('parameter bulan divalidasi');

  // --- Admin
  r = await req('GET', `/admin/rekap?bulan=${bulan}`, { token: adm });
  assert.equal(r.body.pegawai.length, 30); assert.equal(r.body.total.hadir, 1); assert.equal(r.body.total.sakit, 1); ok('rekap bulanan seluruh pegawai');
  const foto = (await req('GET', `/admin/absensi?bulan=${bulan}`, { token: adm })).body.data.find((d) => d.fotoMasuk).fotoMasuk;
  assert.equal((await fetch(`${base}/foto/${foto}`)).status, 401);
  assert.equal((await fetch(`${base}/foto/${foto}`, { headers: { Authorization: `Bearer ${adm}` } })).status, 200); ok('foto hanya bisa dilihat setelah login');
  assert.equal((await fetch(`${base}/foto/${foto}`, { headers: { Authorization: `Bearer ${peg2}` } })).status, 403); ok('pegawai tidak bisa melihat foto pegawai lain');
  r = await req('GET', `/admin/rekap/export?bulan=${bulan}&format=csv`, { token: adm });
  assert(r.body.includes('Menyusun laporan bulanan') && r.headers.get('content-type').includes('csv')); ok('ekspor CSV');
  r = await fetch(`${base}/admin/rekap/export?bulan=${bulan}&format=xlsx`, { headers: { Authorization: `Bearer ${adm}` } });
  assert.equal(r.status, 200); assert.equal(Buffer.from(await r.arrayBuffer()).slice(0, 2).toString(), 'PK'); ok('ekspor Excel (.xlsx)');

  // CRUD pegawai
  r = await req('POST', '/admin/pegawai', { token: adm, json: { kode: 'PPNPN031', nama: 'Tes Baru', jabatan: 'Teknisi', username: 'tesbaru', password: 'rahasia1' } });
  assert.equal(r.status, 201); const id = r.body.id; assert(!('password_hash' in r.body));
  assert.equal((await req('POST', '/admin/pegawai', { token: adm, json: { kode: 'PPNPN032', nama: 'X', jabatan: 'Y', username: 'tesbaru', password: 'rahasia1' } })).status, 409); ok('buat akun & username ganda ditolak');
  assert.equal((await req('PUT', `/admin/pegawai/${id}`, { token: adm, json: { jabatan: 'Pranata Komputer' } })).body.jabatan, 'Pranata Komputer'); ok('ubah pegawai');
  assert.equal((await req('POST', '/auth/login', { json: { username: 'tesbaru', password: 'rahasia1' } })).status, 200); ok('password ter-hash bisa dipakai login');
  assert.equal((await req('DELETE', `/admin/pegawai/${id}`, { token: adm })).status, 200); ok('hapus pegawai');
  const abs = (await req('GET', `/admin/absensi?bulan=${bulan}`, { token: adm })).body.data;
  assert.equal((await req('DELETE', `/admin/absensi/${abs[0].id}`, { token: adm })).status, 200); ok('hapus data absensi');

  // --- Pengaturan oleh admin (berlaku langsung tanpa restart)
  assert.equal((await req('GET', '/admin/pengaturan', { token: peg })).status, 403); ok('pegawai tidak bisa membuka pengaturan admin');
  const set = (o) => req('PUT', '/admin/pengaturan', { token: adm, json: { lat: KANTOR.lat, lon: KANTOR.lon, radiusMeter: 500, jamMasuk: '08:00', jamPulang: '16:00', batasTerlambat: '08:30', ...o } });
  assert.equal((await set({ lat: 95 })).status, 400);
  assert.equal((await set({ radiusMeter: 5 })).status, 400);
  assert.equal((await set({ jamMasuk: '17:00' })).status, 400);
  assert.equal((await set({ batasTerlambat: '07:00' })).status, 400);
  assert.equal((await set({ jamMasuk: '8.00' })).status, 400); ok('pengaturan tidak valid ditolak');
  const peg3 = (await req('POST', '/auth/login', { json: { username: 'ppnpn003', password: 'pegawai123' } })).body.token;
  assert.equal((await set({ radiusMeter: 20 })).status, 200);
  assert.equal((await req('POST', '/absensi/masuk', { token: peg3, form: formAbsen(KANTOR.lat + 0.001, KANTOR.lon) })).status, 422); ok('radius baru (20 m) langsung berlaku');
  assert.equal((await set({ lat: KANTOR.lat + 0.001, radiusMeter: 20, jamMasuk: '00:00', jamPulang: '23:59', batasTerlambat: '23:00' })).status, 200);
  const kf2 = (await req('GET', '/konfigurasi')).body;
  assert(Math.abs(kf2.kantor.lat - (KANTOR.lat + 0.001)) < 1e-9 && kf2.jamPulang === '23:59'); ok('endpoint konfigurasi mengikuti pengaturan admin');
  r = await req('POST', '/absensi/masuk', { token: peg3, form: formAbsen(KANTOR.lat + 0.001, KANTOR.lon) });
  assert.equal(r.status, 201); assert.equal(r.body.absensi.statusWaktu, 'hadir'); ok('koordinat kantor baru & batas terlambat baru berlaku');

  server.close(); fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\nSemua ${n} pengecekan lulus.`);
  process.exit(0);
})().catch((e) => { console.error('\nGAGAL:', e); process.exit(1); });
