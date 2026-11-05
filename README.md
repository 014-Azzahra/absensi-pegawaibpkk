# Sistem Presensi PPNPN – BPKK Kendari

Aplikasi presensi pegawai PPNPN berbasis web: **frontend** (HTML/CSS/JavaScript) + **backend REST API** (Node.js + Express) + **database SQLite**. Presensi memakai foto selfie dan lokasi GPS (radius 500 m dari kantor) yang **divalidasi ulang di server**.

## Fitur

| Peran | Fitur |
|-------|-------|
| Pegawai | Login, absen masuk (foto + GPS), pengajuan izin/sakit/cuti, simpan kegiatan harian, absen pulang, riwayat, rekap bulanan pribadi (pilih bulan) |
| Admin | Dashboard, pengaturan lokasi kantor/radius/jam kerja, kalender kehadiran, detail harian (foto & kegiatan), rekap bulanan seluruh pegawai, unduh CSV/Excel, kelola akun pegawai (tambah/ubah/hapus/reset sandi), hapus data absensi |

Keamanan: kata sandi di-hash (bcrypt), autentikasi JWT, peran `admin`/`pegawai`, foto hanya bisa dibuka setelah login, validasi tipe file foto, perlindungan CSV injection, batas percobaan login.

## Struktur Proyek

```text
absensi-pegawaibpkk/
├── index.html, loginadmin.html, pegawai.html, admin.html, lupasandi.html   # Frontend
├── css/, img/
├── js/
│   ├── api.js            # klien fetch + token JWT (dipakai semua halaman)
│   ├── admin.js          # logika halaman admin
│   └── (pegawai.js, rekap.js, kamera.js, lokasi.js: sisa Minggu 2, tidak dipakai lagi)
├── server/               # Backend
│   ├── src/              # app.js, config.js, db.js, seed.js, routes/, services/, middleware/, utils/
│   ├── seed/pegawai.json # data awal 30 pegawai
│   ├── test/smoke.test.js
│   ├── data/             # database SQLite (dibuat otomatis, tidak di-commit)
│   └── uploads/          # foto presensi (tidak di-commit)
└── docs/                 # API.md, PANDUAN_PENGGUNA.md, LAPORAN_AKHIR.md, PRESENTASI.md
```

## Instalasi & Menjalankan

Prasyarat: **Node.js 22.5 atau lebih baru** (`node -v`). Database memakai SQLite bawaan Node, jadi tidak perlu XAMPP, MySQL, maupun Visual Studio/kompilasi C++.

```bash
cd server
npm install
cp .env.example .env     # opsional; semua nilai punya default
npm start
```

Buka **http://localhost:3000** — server Express sekaligus menyajikan frontend, jadi tidak perlu Live Server.
Saat pertama kali jalan, database dibuat otomatis dan diisi akun awal:

| Peran | Username | Kata sandi |
|-------|----------|------------|
| Admin (`/loginadmin.html`) | `admin` | `admin123` |
| Pegawai (30 akun) | `ppnpn001` … `ppnpn030` (atau nama ID-nya) | `pegawai123` |

> **Ganti kata sandi bawaan** lewat `.env` (`ADMIN_PASSWORD`, `PEGAWAI_PASSWORD_AWAL`) sebelum database pertama dibuat, atau ubah lewat menu *Kelola Akun*. Untuk mengulang dari awal, hapus isi folder `server/data/`.

**Catatan kamera & GPS:** browser hanya mengizinkan kamera/lokasi di `localhost` atau HTTPS. Untuk uji di HP, gunakan HTTPS (mis. tunnel seperti ngrok/cloudflared) atau deploy ke hosting ber-HTTPS.
Untuk demo di luar kantor, ubah `KANTOR_LAT` / `KANTOR_LON` di `.env` ke koordinat lokasi Anda.

**Frontend lewat Live Server?** Bisa — `js/api.js` otomatis mengarah ke `http://localhost:3000` bila halaman tidak dibuka dari port 3000 (CORS sudah diaktifkan).

### Menjalankan tes

```bash
cd server && npm test     # 32 pengecekan: auth, radius, foto, kegiatan, rekap, ekspor, CRUD
```

## Konfigurasi

Koordinat kantor, radius, jam masuk/pulang, dan batas terlambat dapat diubah admin lewat menu **Pengaturan** (langsung berlaku, tanpa restart). Nilai di `.env` di bawah hanya menjadi **nilai awal** sebelum admin pernah mengubahnya.

### `server/.env`

| Variabel | Bawaan | Keterangan |
|----------|--------|-----------|
| `PORT` | 3000 | Port server |
| `JWT_SECRET` | otomatis | Kunci tanda tangan token (dibuat & disimpan di `data/jwt.secret` bila kosong) |
| `KANTOR_LAT`, `KANTOR_LON` | titik BPKK Kendari | Koordinat kantor |
| `RADIUS_METER` | 500 | Radius maksimum presensi |
| `JAM_MASUK`, `JAM_PULANG` | 08:00, 16:00 | Jam kerja (ditampilkan di halaman pegawai) |
| `BATAS_TERLAMBAT` | 08:30 | Masuk setelah jam ini = terlambat |
| `ZONA_WAKTU` | Asia/Makassar | Zona waktu penentu tanggal & jam presensi (WITA) |
| `SHEETS_WEBHOOK_URL` | kosong | (Opsional) sinkronisasi Google Sheets, lihat di bawah |

## Dokumentasi

- [Daftar endpoint API](docs/API.md)
- [Panduan pengguna](docs/PANDUAN_PENGGUNA.md)
- [Laporan akhir (draft)](docs/LAPORAN_AKHIR.md) · [Outline presentasi](docs/PRESENTASI.md)

## (Opsional) Sinkronisasi Google Sheets

1. Buat Google Sheet, buka **Extensions → Apps Script**, tempel isi [`docs/google-apps-script.gs`](docs/google-apps-script.gs).
2. **Deploy → New deployment → Web app** (Execute as: *Me*, Access: *Anyone*), salin URL-nya.
3. Isi `SHEETS_WEBHOOK_URL=<url>` di `server/.env`, restart server. Setiap absen masuk/pulang akan ditambahkan/diperbarui sebagai baris di sheet. Jika gagal kirim, absensi tetap tersimpan di SQLite.

## Teknologi

Node.js · Express 5 · SQLite (`node:sqlite`) · bcryptjs · jsonwebtoken · multer · exceljs · HTML/CSS/JavaScript (vanilla, `fetch`).
