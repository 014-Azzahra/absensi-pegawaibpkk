# Sistem Presensi PPNPN - BPKK Kendari

Pengembangan minggu kedua dari antarmuka statis menjadi aplikasi front-end dinamis menggunakan HTML, CSS, dan Vanilla JavaScript.

## Fitur minggu kedua
- Data 30 pegawai dummy pada `js/data/pegawai.json`.
- Jam dan tanggal digital real-time, serta identitas pegawai.
- Pilihan status hadir, izin, sakit, dan cuti.
- Absen hadir wajib foto dan validasi lokasi maksimal 500 meter dari kantor.
- Pengajuan izin/sakit/cuti wajib mengisi alasan; tidak memerlukan validasi radius kantor.
- Foto dikompres menjadi JPEG sebelum disimpan di localStorage.
- Tidak dapat absen masuk dua kali dalam sehari; absen pulang hanya tersedia setelah absen masuk.
- Kegiatan dan foto wajib sebelum absen pulang dikirim.
- Status terlambat otomatis jika absen masuk setelah pukul 08.00.
- Rekap bulanan: hadir, terlambat, izin, sakit, cuti, dan tanpa keterangan.

## Struktur
```text
absensi-pegawaibpkk/
├── index.html
├── pegawai.html
├── rekap.html
├── admin.html
├── loginadmin.html
├── lupasandi.html
├── css/style.css
├── img/logo-bpkk.png
└── js/
    ├── pegawai.js
    ├── rekap.js
    └── data/pegawai.json
```

## Menjalankan aplikasi
1. Buka folder proyek di VS Code.
2. Jalankan menggunakan ekstensi **Live Server** (jangan membuka HTML langsung dengan `file://`, karena data JSON memakai `fetch`).
3. Login demo memakai ID `PPNPN001` sampai `PPNPN030`, atau nama pegawai yang tercantum pada file JSON.
4. Izinkan akses kamera dan lokasi pada browser. Geolocation dan kamera memerlukan HTTPS atau localhost.

## Konfigurasi lokasi dan jam kerja
Pada `js/pegawai.js`, sesuaikan konstanta `KANTOR` dengan titik pin tepat kantor BPKK Kendari dari Google Maps dan `BATAS_TERLAMBAT` dengan ketentuan jam kerja resmi. Koordinat yang disediakan saat ini masih nilai awal/perkiraan, wajib diverifikasi sebelum pengujian lapangan.

## Penyimpanan dan batasan
Data disimpan di `localStorage` browser. Artinya data tidak tersinkron antarperangkat, dapat dihapus oleh pengguna, dan bukan penyimpanan resmi. Foto telah diperkecil, tetapi kapasitas localStorage tetap terbatas. Untuk penggunaan operasional diperlukan backend, database, autentikasi, dan validasi lokasi di server.

## Rencana commit GitHub (minimal 5 commit bermakna)
1. `feat: add 30 dummy employee records in JSON`
2. `feat: make employee attendance page dynamic`
3. `feat: add camera preview and compressed photo storage`
4. `feat: add geolocation radius and attendance validation`
5. `feat: add monthly attendance recap from localStorage`

Commit dilakukan bertahap setelah masing-masing fitur selesai dan diuji.
