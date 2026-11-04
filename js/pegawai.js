/* Sistem Presensi PPNPN - Logika Halaman Pegawai */

const STORAGE_KEY = 'bpkk_absensi_v2';
const SESSION_KEY = 'bpkk_user_aktif';

const BATAS_TERLAMBAT = '08:30';
const RADIUS_KANTOR = 500;

const KANTOR = {
    lat: -3.971464128431429,
    lon: 122.51444925176875
};

let pegawaiAktif = null;
let fotoMasuk = '';
let fotoPulang = '';
let posisiTerakhir = null;

let streamKamera = null;

let fotoSementara = {
    masuk: '',
    pulang: ''
};

const $ = (id) => document.getElementById(id);

const bacaAbsensi = () =>
    JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

const simpanAbsensi = (data) =>
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

const tanggalHariIni = () =>
    new Date().toLocaleDateString('en-CA');

const waktuSekarang = () =>
    new Date().toTimeString().slice(0, 5);


/* MEMUAT DATA PEGAWAI */

async function muatPegawai() {
    const response = await fetch('js/data/pegawai.json');

    if (!response.ok) {
        throw new Error('Data pegawai tidak dapat dimuat.');
    }

    return response.json();
}


/* JAM DAN TANGGAL */

function updateJam() {
    const now = new Date();

    $('jam-digital').textContent =
        now.toLocaleTimeString('id-ID', {
            hour12: false
        });

    $('tanggal-digital').textContent =
        now.toLocaleDateString('id-ID', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
}


/* PESAN NOTIFIKASI */

function setPesan(id, pesan, tipe = 'info') {
    const el = $(id);

    if (!el) return;

    el.textContent = pesan;
    el.className = `notice ${tipe}`;
}


/* IDENTITAS PEGAWAI */

function tampilkanIdentitas() {
    $('nama-pegawai').textContent = pegawaiAktif.nama;

    $('jabatan-pegawai').textContent =
        `${pegawaiAktif.jabatan} • ${pegawaiAktif.id}`;
}


/* NAVIGASI TAB */

function bukaTab(tipe) {
    if (tipe === 'pulang' && $('btn-tab-pulang').disabled) {
        return;
    }

    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.classList.remove('active', 'pulang');
    });

    document.querySelectorAll('.tab-content').forEach((content) => {
        content.classList.remove('active');
    });

    const tombolTab = $(
        tipe === 'masuk'
            ? 'btn-tab-masuk'
            : 'btn-tab-pulang'
    );

    tombolTab.classList.add('active');

    if (tipe === 'pulang') {
        tombolTab.classList.add('pulang');
    }

    $(`content-${tipe}`).classList.add('active');
}


/* PERUBAHAN STATUS KEHADIRAN */

function ubahStatusKehadiran() {
    const status = $('status-kehadiran').value;
    const hadirDiKantor = status === 'hadir';

    $('area-izin').hidden = hadirDiKantor || !status;
    $('area-kamera-masuk').hidden = !status;
    $('area-lokasi').hidden = !hadirDiKantor;

    $('alasan-izin').required =
        !hadirDiKantor && !!status;

    $('btn-absen-masuk').textContent =
        status === 'hadir'
            ? 'Kirim Absen Masuk'
            : 'Kirim Izin';

    $('btn-absen-masuk').disabled = !status;
}


/* KAMERA LANGSUNG */

async function bukaKamera(target) {
    try {
        hentikanKamera();

        if (!navigator.mediaDevices ||
            !navigator.mediaDevices.getUserMedia) {
            throw new Error('Browser tidak mendukung akses kamera.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
                facingMode: 'user',
                width: { ideal: 720 },
                height: { ideal: 960 }
            }
        });

        streamKamera = stream;

        const video = $(`video-${target}`);

        video.srcObject = stream;

        $(`kamera-live-${target}`).hidden = false;
        $(`konfirmasi-${target}`).hidden = true;
        $(`preview-${target}`).hidden = true;

        await video.play();

    } catch (error) {
        hentikanKamera();

        setPesan(
            `pesan-foto-${target}`,
            error.message ||
                'Kamera tidak dapat dibuka. Izinkan akses kamera pada browser.',
            'error'
        );
    }
}


/* MENGHENTIKAN KAMERA */

function hentikanKamera() {
    if (streamKamera) {
        streamKamera.getTracks().forEach((track) => {
            track.stop();
        });

        streamKamera = null;
    }
}


/* MENGAMBIL FOTO */

function ambilFotoLangsung(target) {
    const video = $(`video-${target}`);
    const canvas = $(`canvas-${target}`);

    if (!video.videoWidth) {
        return setPesan(
            `pesan-foto-${target}`,
            'Kamera belum siap. Coba beberapa saat lagi.',
            'error'
        );
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    fotoSementara[target] = canvas.toDataURL(
        'image/jpeg',
        0.62
    );

    $(`preview-${target}`).src = fotoSementara[target];
    $(`preview-${target}`).hidden = false;

    $(`kamera-live-${target}`).hidden = true;
    $(`konfirmasi-${target}`).hidden = false;

    hentikanKamera();

    setPesan(
        `pesan-foto-${target}`,
        'Foto berhasil diambil. Periksa hasil foto sebelum menggunakannya.',
        'success'
    );
}


/* MENGULANG FOTO */

function ulangiFoto(target) {
    fotoSementara[target] = '';

    bukaKamera(target);
}


/* KONFIRMASI FOTO */

function gunakanFoto(target) {
    if (!fotoSementara[target]) {
        return setPesan(
            `pesan-foto-${target}`,
            'Ambil foto terlebih dahulu.',
            'error'
        );
    }

    if (target === 'masuk') {
        fotoMasuk = fotoSementara.masuk;
    } else {
        fotoPulang = fotoSementara.pulang;
    }

    $(`konfirmasi-${target}`).hidden = true;

    setPesan(
        `pesan-foto-${target}`,
        'Foto berhasil dikonfirmasi dan siap digunakan untuk absensi.',
        'success'
    );

    // Perbarui tombol setelah foto dikonfirmasi
    if (target === 'pulang' && pegawaiAktif) {
        perbaruiStatusHariIni();
    }
}


/* VALIDASI LOKASI */

async function ambilLokasi() {
    const lokasi = await PresensiLokasi.ambil(
        KANTOR,
        RADIUS_KANTOR
    );

    posisiTerakhir = lokasi;

    setPesan(
        'pesan-lokasi',
        `Lokasi sesuai. Jarak ke kantor sekitar ${Math.round(lokasi.jarak)} meter (akurasi GPS ±${Math.round(lokasi.accuracy)} m).`,
        'success'
    );

    return lokasi;
}


/* STATUS KETERLAMBATAN */

function statusTerlambat(jam) {
    return jam > BATAS_TERLAMBAT
        ? 'terlambat'
        : 'hadir';
}


/* KIRIM ABSEN MASUK */

async function kirimAbsenMasuk() {
    const status = $('status-kehadiran').value;

    if (!status) {
        return setPesan(
            'pesan-masuk',
            'Pilih status kehadiran terlebih dahulu.',
            'error'
        );
    }

    const data = bacaAbsensi();

    const sudahAbsen = data.some((record) =>
        record.pegawaiId === pegawaiAktif.id &&
        record.tanggal === tanggalHariIni()
    );

    if (sudahAbsen) {
        return setPesan(
            'pesan-masuk',
            'Anda sudah mengisi absensi hari ini.',
            'error'
        );
    }

    if (!fotoMasuk) {
        return setPesan(
            'pesan-masuk',
            'Foto selfie wajib dilampirkan sebelum absen.',
            'error'
        );
    }

    let lokasi = null;

    if (status === 'hadir') {
        try {
            lokasi = await ambilLokasi();
        } catch (error) {
            return setPesan(
                'pesan-masuk',
                error.message,
                'error'
            );
        }
    } else if (!$('alasan-izin').value.trim()) {
        return setPesan(
            'pesan-masuk',
            'Alasan izin/sakit/cuti wajib diisi.',
            'error'
        );
    }

    const jam = waktuSekarang();

    const record = {
        id: `ABS-${Date.now()}`,
        pegawaiId: pegawaiAktif.id,
        nama: pegawaiAktif.nama,
        jabatan: pegawaiAktif.jabatan,

        tanggal: tanggalHariIni(),
        status: status,

        statusWaktu: status === 'hadir'
            ? statusTerlambat(jam)
            : status,

        jamMasuk: status === 'hadir'
            ? jam
            : null,

        alasan: status === 'hadir'
            ? ''
            : $('alasan-izin').value.trim(),

        fotoMasuk: fotoMasuk,
        lokasiMasuk: lokasi,

        jamPulang: null,
        fotoPulang: '',
        kegiatan: ''
    };

    try {
        data.push(record);
        simpanAbsensi(data);

    } catch (error) {
        return setPesan(
            'pesan-masuk',
            'Penyimpanan penuh. Kurangi ukuran foto atau hapus data uji lama.',
            'error'
        );
    }

    setPesan(
        'pesan-masuk',
        status === 'hadir'
            ? `Absen masuk berhasil pukul ${jam}. Status: ${record.statusWaktu}.`
            : `Pengajuan ${status} berhasil dicatat.`,
        'success'
    );

    perbaruiStatusHariIni();
}


/* KIRIM ABSEN PULANG */

async function kirimAbsenPulang() {
    const kegiatan = $('kegiatan-pulang').value.trim();

    if (kegiatan.length < 5) {
        return setPesan(
            'pesan-pulang',
            'Isi kegiatan hari ini minimal 5 karakter.',
            'error'
        );
    }

    if (!fotoPulang) {
        return setPesan(
            'pesan-pulang',
            'Foto selfie wajib dilampirkan sebelum absen pulang.',
            'error'
        );
    }

    const data = bacaAbsensi();

    const record = data.find((item) =>
        item.pegawaiId === pegawaiAktif.id &&
        item.tanggal === tanggalHariIni()
    );

    if (!record) {
        return setPesan(
            'pesan-pulang',
            'Anda belum melakukan absen masuk hari ini.',
            'error'
        );
    }

    if (record.status !== 'hadir') {
        return setPesan(
            'pesan-pulang',
            'Absen pulang tidak berlaku untuk status izin/sakit/cuti.',
            'error'
        );
    }

    if (record.jamPulang) {
        return setPesan(
            'pesan-pulang',
            'Absen pulang sudah tercatat hari ini.',
            'error'
        );
    }

    let lokasi;

    try {
        lokasi = await ambilLokasi();

    } catch (error) {
        return setPesan(
            'pesan-pulang',
            error.message,
            'error'
        );
    }

    record.jamPulang = waktuSekarang();
    record.kegiatan = kegiatan;
    record.fotoPulang = fotoPulang;
    record.lokasiPulang = lokasi;

    try {
        simpanAbsensi(data);

    } catch (error) {
        return setPesan(
            'pesan-pulang',
            'Penyimpanan penuh. Foto terlalu besar.',
            'error'
        );
    }

    setPesan(
        'pesan-pulang',
        `Absen pulang berhasil pukul ${record.jamPulang}.`,
        'success'
    );

    perbaruiStatusHariIni();
}


/* MEMPERBARUI STATUS ABSENSI */

function perbaruiStatusHariIni() {
    if (!pegawaiAktif) return;

    const record = bacaAbsensi().find((item) =>
        item.pegawaiId === pegawaiAktif.id &&
        item.tanggal === tanggalHariIni()
    );

    $('status-hari-ini').textContent = !record
        ? 'Belum melakukan absensi'
        : record.status === 'hadir'
            ? `Masuk ${record.jamMasuk}${record.jamPulang ? ` • Pulang ${record.jamPulang}` : ' • Belum absen pulang'}`
            : `Tercatat ${record.status}`;

    const bolehAbsenPulang =
        !!record &&
        record.status === 'hadir' &&
        !record.jamPulang;

    $('btn-tab-pulang').disabled = !bolehAbsenPulang;

    $('btn-absen-pulang').disabled =
        !bolehAbsenPulang ||
        $('kegiatan-pulang').value.trim().length < 5 ||
        !fotoPulang;

    if (!record || record.status !== 'hadir') {
        $('hint-pulang').textContent =
            'Absen masuk hadir harus tercatat terlebih dahulu.';

    } else if (record.jamPulang) {
        $('hint-pulang').textContent =
            'Absensi hari ini sudah selesai.';

    } else {
        $('hint-pulang').textContent =
            'Isi kegiatan dan lampirkan foto untuk mengaktifkan absen pulang.';
    }
}


/* INISIALISASI HALAMAN */

async function init() {
    // Pastikan data pegawai berhasil dimuat
    try {
        const list = await muatPegawai();

        if (!Array.isArray(list) || list.length === 0) {
            throw new Error('Data pegawai masih kosong.');
        }

        const saved = localStorage.getItem(SESSION_KEY);

        pegawaiAktif =
            list.find((pegawai) => pegawai.id === saved) ||
            list[0];

        if (!saved || !list.some((pegawai) => pegawai.id === saved)) {
            localStorage.setItem(SESSION_KEY, pegawaiAktif.id);
        }

        tampilkanIdentitas();
        perbaruiStatusHariIni();

    } catch (error) {
        setPesan('pesan-masuk', error.message, 'error');
        return;
    }

    // Jam digital
    updateJam();
    setInterval(updateJam, 1000);

    // Status kehadiran
    $('status-kehadiran').addEventListener(
        'change',
        ubahStatusKehadiran
    );

    // Kamera masuk
    $('btn-kamera-masuk').addEventListener(
        'click',
        () => bukaKamera('masuk')
    );

    $('btn-ambil-masuk').addEventListener(
        'click',
        () => ambilFotoLangsung('masuk')
    );

    $('btn-ulangi-masuk').addEventListener(
        'click',
        () => ulangiFoto('masuk')
    );

    $('btn-gunakan-masuk').addEventListener(
        'click',
        () => gunakanFoto('masuk')
    );

    // Kamera pulang
    $('btn-kamera-pulang').addEventListener(
        'click',
        () => bukaKamera('pulang')
    );

    $('btn-ambil-pulang').addEventListener(
        'click',
        () => ambilFotoLangsung('pulang')
    );

    $('btn-ulangi-pulang').addEventListener(
        'click',
        () => ulangiFoto('pulang')
    );

    $('btn-gunakan-pulang').addEventListener(
        'click',
        () => gunakanFoto('pulang')
    );

    // Tombol absensi
    $('btn-absen-masuk').addEventListener(
        'click',
        kirimAbsenMasuk
    );

    $('btn-absen-pulang').addEventListener(
        'click',
        kirimAbsenPulang
    );

    // Input kegiatan
    $('kegiatan-pulang').addEventListener(
        'input',
        perbaruiStatusHariIni
    );

    // Navigasi tab
    $('btn-tab-masuk').addEventListener(
        'click',
        () => bukaTab('masuk')
    );

    $('btn-tab-pulang').addEventListener(
        'click',
        () => bukaTab('pulang')
    );

    // Keluar
    $('btn-keluar').addEventListener('click', () => {
        hentikanKamera();

        localStorage.removeItem(SESSION_KEY);

        location.href = 'index.html';
    });
}


// Hentikan kamera ketika halaman ditinggalkan
window.addEventListener('beforeunload', hentikanKamera);


// Jalankan setelah HTML selesai dimuat
document.addEventListener('DOMContentLoaded', init);