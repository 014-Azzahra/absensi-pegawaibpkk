# Dokumentasi API

Base URL: `http://localhost:3000`. Semua body/respons JSON kecuali disebutkan lain.
Endpoint selain `/api/auth/login` wajib header `Authorization: Bearer <token>`.
Error selalu berbentuk `{ "pesan": "..." }` dengan status HTTP yang sesuai:
`400` input tidak valid · `401` belum login · `403` bukan hak akses · `404` tidak ditemukan · `409` konflik/duplikat · `422` aturan presensi dilanggar (radius, kegiatan) · `429` terlalu banyak percobaan login.

## Konfigurasi (publik)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/konfigurasi` | Koordinat kantor, radius, jam kerja, batas terlambat (dari `.env`) — dipakai frontend agar tidak menulis ganda |

## Autentikasi

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/api/auth/login` | Body `{username, password}` (pegawai boleh memakai ID, mis. `PPNPN001`). Respons `{token, user:{id,kode,nama,jabatan,username,role}}` |
| GET | `/api/profil` | Profil karyawan yang sedang login (peran pegawai) |

## Pegawai (peran `pegawai`)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/absensi/hari-ini` | Status absensi hari ini → `{tanggal, jamServer, absensi|null}` |
| POST | `/api/absensi/masuk` | **multipart/form-data**: `status` (`hadir`/`izin`/`sakit`/`cuti`). Jika `hadir`: `lat`, `lon`, `foto` (wajib). Jika bukan hadir: `alasan` (wajib). |
| PUT | `/api/absensi/kegiatan` | Body `{kegiatan}` (5–2000 karakter). Menyimpan kegiatan harian sebelum pulang |
| POST | `/api/absensi/pulang` | **multipart**: `lat`, `lon`, `foto` |
| GET | `/api/absensi/riwayat?bulan=YYYY-MM` | Riwayat absensi pribadi (bulan default: bulan berjalan) |
| GET | `/api/absensi/rekap?bulan=YYYY-MM` | Rekap bulanan pribadi `{bulan, hariKerja, rekap:{hadir,terlambat,izin,sakit,cuti,tanpaKeterangan}, riwayat[]}` |

**Validasi server pada absen:**
- `masuk` (hadir): jarak ke kantor ≤ 500 m (Haversine) → jika lebih, `422`; foto wajib (JPG/PNG/WebP, maks 5 MB, tipe dicek dari isi file); satu absensi per hari (`409`); terlambat dihitung dari jam server (WITA) > `BATAS_TERLAMBAT`.
- `pulang`: harus sudah absen masuk berstatus hadir; **kegiatan harus sudah tersimpan** (`422`); radius & foto divalidasi ulang; tidak bisa dua kali.

## Foto

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/foto/:nama` | File foto dari folder `uploads/`. Admin: semua; pegawai: hanya miliknya (`403` jika bukan) |

## Admin (peran `admin`)

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/api/admin/dashboard?bulan=` | Total bulan ini + 5 aktivitas terbaru |
| GET | `/api/admin/pengaturan` | Pengaturan presensi saat ini |
| PUT | `/api/admin/pengaturan` | Body `{lat, lon, radiusMeter(10-5000), jamMasuk, jamPulang, batasTerlambat}` (HH:MM). Disimpan di tabel `pengaturan`, langsung berlaku tanpa restart |
| GET | `/api/admin/pegawai` | Daftar pegawai |
| GET | `/api/admin/pegawai/:id` | Detail pegawai |
| POST | `/api/admin/pegawai` | Body `{kode, nama, jabatan, username, password(≥6)}` → `201` |
| PUT | `/api/admin/pegawai/:id` | Ubah data; `password` opsional (reset); `aktif` true/false |
| DELETE | `/api/admin/pegawai/:id` | Hapus akun beserta riwayat & fotonya |
| GET | `/api/admin/absensi?tanggal=YYYY-MM-DD` atau `?bulan=YYYY-MM` | Data absensi seluruh pegawai (termasuk nama file foto & kegiatan) |
| DELETE | `/api/admin/absensi/:id` | Hapus satu data absensi |
| GET | `/api/admin/rekap?bulan=YYYY-MM` | Rekap bulanan seluruh pegawai + total |
| GET | `/api/admin/rekap/export?bulan=&format=csv\|xlsx&jenis=detail\|ringkasan` | Unduh rekap. `xlsx` berisi 2 sheet (Rekap Bulanan & Detail Harian); `jenis` berlaku untuk CSV |

## Skema Database (SQLite)

- `users(id, kode, nama, jabatan, username, password_hash, role, aktif, created_at)`
- `absensi(id, user_id → users, tanggal, status, status_waktu, jam_masuk, jam_pulang, alasan, kegiatan, foto_masuk, foto_pulang, lat/lon/jarak_masuk, lat/lon/jarak_pulang, created_at)` dengan `UNIQUE(user_id, tanggal)`.
  Kolom `foto_*` hanya menyimpan **nama file** di folder `server/uploads/`.

## Contoh (curl)

```bash
TOKEN=$(curl -s -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' \
  -d '{"username":"ppnpn001","password":"pegawai123"}' | node -pe 'JSON.parse(require("fs").readFileSync(0)).token')

curl -X POST localhost:3000/api/absensi/masuk -H "Authorization: Bearer $TOKEN" \
  -F status=hadir -F lat=-3.9715 -F lon=122.5145 -F foto=@selfie.jpg
```
