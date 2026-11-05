# Panduan Pengguna

## Pegawai

1. Buka aplikasi, masukkan **username/ID pegawai** (mis. `ppnpn001`) dan **kata sandi**, lalu klik *Masuk ke presensi*. Lupa sandi → hubungi admin.
2. **Absen masuk** (menu *Absen*):
   - Izinkan akses **lokasi** dan **kamera** di browser. Banner hijau berarti Anda berada dalam radius 500 m kantor.
   - Pilih *Hadir di Kantor*, klik kotak kamera, tekan tombol bulat untuk mengambil foto, lalu *Gunakan Foto* → *Kirim Absen Masuk*.
   - Tidak hadir? Pilih *Izin/Sakit/Cuti*, isi alasan, kirim (tanpa foto/lokasi).
   - Masuk setelah pukul 08:30 tercatat **Terlambat**.
3. **Kegiatan harian & absen pulang** (tab *Absen Pulang*, aktif setelah absen masuk hadir):
   - Tulis kegiatan hari ini (min. 5 karakter) dan klik *Simpan Kegiatan* (boleh dilakukan sepanjang hari).
   - Ambil foto selfie → *Kirim Absen Pulang*. Absen pulang **ditolak** jika kegiatan belum diisi, foto belum ada, atau Anda di luar radius.
4. **Rekap** (menu *Rekap*): pilih bulan pada kolom *Periode* untuk melihat jumlah hadir, terlambat, izin/sakit/cuti, tanpa keterangan, dan riwayat harian.

## Admin

1. Masuk lewat **/loginadmin.html**.
2. **Beranda**: ringkasan bulan ini dan aktivitas terbaru.
3. **Rekap Pegawai**: pilih bulan →
   - kalender: klik tanggal kerja untuk melihat siapa saja yang absen, **foto masuk/pulang**, dan **kegiatan**; tombol *Hapus* menghapus satu data;
   - tabel *Rekap Bulanan Seluruh Pegawai* di bawah kalender;
   - **Unduh CSV** (detail harian) atau **Unduh Excel** (2 sheet: rekap bulanan + detail).
4. **Pengaturan**: ubah latitude/longitude kantor (tempel koordinat dari Google Maps, atau klik *Pakai lokasi saya saat ini*), radius, jam masuk, batas terlambat, dan jam pulang, lalu *Simpan Pengaturan*. Berlaku langsung; pegawai cukup memuat ulang halaman Absen.
5. **Kelola Akun**: tambah pegawai baru, *Ubah* (nama, jabatan, reset kata sandi), atau *Hapus* (riwayat absensinya ikut terhapus).

## Pemecahan Masalah

| Masalah | Solusi |
|---------|--------|
| "Tidak dapat terhubung ke server" | Pastikan `npm start` berjalan di folder `server` |
| Kamera/lokasi tidak muncul | Gunakan `localhost` atau HTTPS dan izinkan akses di browser |
| "Di luar radius kantor" | Dekati kantor; untuk demo ubah `KANTOR_LAT/LON` di `.env` |
| "Sesi berakhir" | Login ulang (token berlaku 12 jam) |
