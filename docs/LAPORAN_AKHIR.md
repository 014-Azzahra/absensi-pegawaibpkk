# Laporan Akhir – Sistem Presensi PPNPN BPKK Kendari (Minggu 3)

> **Draft awal** – disusun dari proses pengerjaan integrasi backend. Sesuaikan dengan pengalaman pribadi tim sebelum dikumpulkan.

## 1. Ringkasan

Pada Minggu 1–2 aplikasi berupa antarmuka statis yang menyimpan data di `localStorage` browser. Minggu 3 menambahkan **backend Node.js (Express) + database SQLite**, menghubungkan frontend lewat `fetch`, serta memindahkan seluruh aturan presensi (radius 500 m, wajib foto, wajib kegiatan sebelum pulang) ke server. Aplikasi mencakup autentikasi berbasis peran (admin/pegawai), unggah foto ke folder `uploads/`, rekap bulanan per pegawai maupun seluruh pegawai, serta ekspor CSV/Excel. Terdapat 32 pengecekan otomatis (`npm test`) dan uji alur penuh di browser.

## 2. Kendala dan Solusi

| # | Kendala | Solusi |
|---|---------|--------|
| 1 | Validasi di frontend mudah dilewati (data/foto/lokasi bisa dimanipulasi lewat DevTools). | Server memvalidasi ulang: jarak Haversine ≤ 500 m, foto wajib dan dicek dari isi file (bukan nama/mimetype), kegiatan tersimpan sebelum pulang, satu absen per hari (`UNIQUE(user_id, tanggal)`). |
| 2 | Halaman pegawai masih memakai satu pegawai yang ditulis langsung di kode, dan login hanya mencocokkan nama dari JSON tanpa kata sandi. | Login memakai kata sandi ter-hash (bcrypt) dan token JWT; profil diambil dari `/api/profil`; setiap halaman mengecek peran. |
| 3 | Foto semula berupa string base64 di `localStorage` (cepat penuh). | Foto dikirim `multipart/form-data`, disimpan sebagai file di `uploads/`, database hanya menyimpan nama file. |
| 4 | Foto bersifat privat, tetapi tag `<img>` tidak bisa mengirim header token. | Endpoint `/api/foto/:nama` dilindungi token; frontend mengambil foto dengan `fetch` lalu menampilkannya lewat blob URL. Pegawai hanya dapat melihat foto miliknya. |
| 5 | Tanggal/jam di browser bisa diubah pengguna, dan server dapat berada di zona waktu lain. | Tanggal, jam masuk, dan status terlambat dihitung di server memakai zona waktu `Asia/Makassar` (WITA). |
| 6 | Data pegawai ada di dua tempat dengan isi berbeda (`pegawai.json` dan `admin.js`). | Satu sumber kebenaran: tabel `users` di SQLite, diisi otomatis dari `server/seed/pegawai.json`. |
| 7 | Input pengguna (nama, kegiatan) ditampilkan lewat `innerHTML` dan masuk ke file CSV/Excel. | Semua teks di-escape di frontend; ekspor menetralkan sel berawalan `= + - @` (CSV/Excel injection). |
| 8 | Kamera & GPS hanya berfungsi di `localhost`/HTTPS. | Dicatat di README; uji otomatis memakai kamera dan GPS palsu pada Chromium. |

## 3. Hasil

Seluruh endpoint wajib pada tugas terpenuhi: login, profil, absen masuk, absen pulang, simpan kegiatan, riwayat, dan rekap bulanan (parameter `bulan`). Halaman pegawai menampilkan rekap pribadi dengan pilihan bulan; halaman admin menampilkan rekap seluruh pegawai, foto dan kegiatan, serta unduhan CSV/Excel. Sinkronisasi Google Sheets tersedia sebagai fitur opsional lewat Apps Script.

## 4. Keterbatasan

- Lokasi GPS berasal dari perangkat sehingga masih dapat dipalsukan (aplikasi *fake GPS*); selfie belum diverifikasi sebagai wajah pegawai yang bersangkutan.
- Pegawai belum dapat mengganti kata sandi sendiri (hanya admin yang mereset).
- Hari libur nasional belum diperhitungkan; hari kerja dihitung Senin–Jumat.
- Pembatas percobaan login disimpan di memori (hilang saat server restart); belum ada pencadangan otomatis database.
- Sinkronisasi Google Sheets belum diuji pada akun Google sungguhan.

## 5. Rencana Pengembangan Lanjutan

1. Deploy ke server ber-HTTPS (VPS/Render/Railway) sehingga dapat dipakai dari HP pegawai.
2. Ubah kata sandi mandiri, wajib ganti sandi pada login pertama.
3. Verifikasi tambahan: deteksi wajah, pemeriksaan akurasi/anomali GPS, pencatatan perangkat.
4. Daftar hari libur nasional/cuti bersama, jam kerja per jabatan, dan alur persetujuan izin/cuti oleh admin.
5. Notifikasi pengingat absen (WhatsApp/email), serta dasbor grafik tren kehadiran.
6. Paginasi & pencarian pada data besar, pencadangan database terjadwal, dan migrasi ke PostgreSQL bila pengguna bertambah.
7. Pengujian otomatis end-to-end dan CI (GitHub Actions).
