markdown
# Sistem Presensi PPNPN - BPKK Kendari

Aplikasi presensi pegawai berbasis web untuk Pegawai Pemerintah Non Pegawai Negeri (PPNPN) di lingkungan BPKK Kendari. Proyek ini saat ini berada pada tahap **pengembangan antarmuka (Front-End UI)**, di mana seluruh halaman masih bersifat statis sebelum diintegrasikan dengan database (Back-End).

## 📂 Struktur Folder

```text
absensi-pegawaibpkk/
│
├── css/                  # File stylesheet (tampilan)
├── img/                  # Aset gambar dan logo
├── admin.html            # Halaman dashboard admin & rekap kehadiran
├── pegawai.html          # Halaman utama absensi pegawai (masuk/pulang)
├── index.html            # Halaman login utama
├── login-admin.html      # Halaman login khusus admin
└── lupa-sandi.html       # Halaman reset password
✨ Fitur (Tampilan Depan)
Saat ini, tampilan depan sudah mencakup:

Halaman Login & Lupa Sandi: Antarmuka untuk masuk ke sistem.

Halaman Presensi Pegawai:

Menampilkan jam dan tanggal statis.

Indikator lokasi (radius kantor).

Tab interaktif (JavaScript minimal) untuk beralih antara Absen Masuk dan Absen Pulang.

Form pengisian status kehadiran, alasan izin, dan unggah selfie.

Halaman Admin (Rekap):

Dashboard ringkasan kehadiran (Hadir, Izin, Tidak Hadir).

Filter periode (Bulan & Tahun).

Tabel detail kehadiran karyawan.

Tombol aksi (Lihat, Edit, Hapus) berwarna netral.

🛠️ Teknologi yang Digunakan
HTML5: Struktur dasar halaman.

CSS3: Styling dan desain responsif (tanpa framework CSS eksternal).

JavaScript (Vanilla): Hanya digunakan secara minimal untuk fungsi interaksi tab pada halaman absensi.
