# Outline Presentasi (10–15 menit) + Skenario Demo

| Menit | Slide / Aktivitas |
|-------|-------------------|
| 0–1 | **Judul & tujuan**: sistem presensi PPNPN BPKK Kendari, dari prototipe statis menjadi aplikasi fullstack |
| 1–3 | **Masalah & kebutuhan**: foto, lokasi 500 m, kegiatan harian, rekap bulanan, dua peran |
| 3–5 | **Arsitektur**: Browser (HTML/JS `fetch`) → Express REST API → SQLite + folder `uploads/`. Tunjukkan diagram & skema 2 tabel |
| 5–6 | **Keamanan**: bcrypt, JWT, peran, foto privat, validasi ulang di server |
| 6–11 | **DEMO LANGSUNG** (lihat skenario di bawah) |
| 11–13 | **Kendala & solusi** (ringkas dari `LAPORAN_AKHIR.md`) |
| 13–15 | **Rencana lanjutan & tanya jawab** |

## Skenario demo

1. `cd server && npm start` → buka `http://localhost:3000`.
2. Login pegawai `ppnpn001` / `pegawai123` → **Absen** → ambil selfie → kirim absen masuk.
3. *(Pembuktian validasi server)* ubah `KANTOR_LAT` ke tempat lain / matikan GPS → tunjukkan penolakan "Di luar radius". Atau coba absen pulang **sebelum** mengisi kegiatan → ditolak (422).
4. Isi kegiatan → *Simpan Kegiatan* → absen pulang dengan foto.
5. Menu **Rekap** → ganti bulan.
6. Logout → `/loginadmin.html` (`admin` / `admin123`) → **Rekap Pegawai** → klik tanggal → tampilkan foto & kegiatan → **Unduh CSV/Excel**.
7. Tunjukkan file di `server/uploads/` dan isi tabel di database (`sqlite3 server/data/absensi.db "select * from absensi"`).
8. Tutup dengan `npm test` (32 pengecekan lulus).

> Tips: siapkan satu akun pegawai dengan data bulan lalu agar rekap tidak kosong, dan uji kamera/GPS di laptop yang dipakai presentasi sebelum mulai.
