/* Sistem Presensi PPNPN - Versi Final Minggu 2 */

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
let fotoSementara = { masuk: '', pulang: '' };

const $ = (id) => document.getElementById(id);

/* ============================================================
   UTILITAS DATA
   ============================================================ */
const bacaAbsensi = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const simpanAbsensi = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const tanggalHariIni = () => new Date().toLocaleDateString('en-CA');
const waktuSekarang = () => new Date().toTimeString().slice(0, 5);
const formatTanggalPanjang = (date = new Date()) => date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

async function muatPegawai() {
    const response = await fetch('js/data/pegawai.json');
    if (!response.ok) throw new Error('Data pegawai tidak dapat dimuat.');
    return response.json();
}

function setPesan(id, pesan, tipe = 'info') {
    const el = $(id);
    if (!el) return;
    el.textContent = pesan;
    el.className = `notice ${tipe}`;
}

/* ============================================================
   ROUTER DINAMIS
   ============================================================ */
const HALAMAN = {
    beranda: { judul: 'Beranda', ikon: '🏠', render: renderBeranda, after: inisialisasiBeranda },
    absen: { judul: 'Absen', ikon: '🕘', render: renderAbsen, after: inisialisasiAbsen },
    rekap: { judul: 'Rekap', ikon: '📊', render: renderRekap, after: inisialisasiRekap }
};
const HALAMAN_DEFAULT = 'beranda';

function halamanDariHash() {
    const hash = location.hash.replace('#', '').trim();
    return HALAMAN[hash] ? hash : HALAMAN_DEFAULT;
}

function renderMenu(aktif) {
    const menu = $('main-menu');
    if (!menu) return;
    menu.innerHTML = Object.entries(HALAMAN).map(([key, cfg]) => `
        <a class="menu-item ${key === aktif ? 'active' : ''}" href="#${key}" data-page="${key}">
            <span class="menu-icon">${cfg.ikon}</span>
            <span class="menu-label">${cfg.judul}</span>
        </a>
    `).join('');
}

function tampilkanHalaman(nama) {
    const cfg = HALAMAN[nama];
    if (!cfg) return;

    hentikanKamera(); // Selalu matikan kamera jika pindah halaman
    renderMenu(nama);
    
    // Render HTML BARU (menghapus event listener lama secara otomatis)
    const main = $('app-main');
    main.innerHTML = cfg.render();

    if (nama === 'absen') bukaTab('masuk');
    
    // Pasang event listener baru
    cfg.after();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function navigasiKe(nama) {
    if (location.hash === `#${nama}`) tampilkanHalaman(nama);
    else location.hash = `#${nama}`;
}

/* ============================================================
   HALAMAN BERANDA
   ============================================================ */
function renderBeranda() {
    const nama = pegawaiAktif ? pegawaiAktif.nama : 'Memuat...';
    const jabatan = pegawaiAktif ? `${pegawaiAktif.jabatan} • ${pegawaiAktif.id}` : 'Memuat posisi...';

    return `
        <div class="header-card">
            <div>
                <h2>${nama}</h2>
                <p>${jabatan}</p>
            </div>
            <div class="datetime-box">
                <h3 id="jam-beranda">00:00:00</h3>
                <span id="tanggal-beranda"></span>
            </div>
        </div>

        <div class="welcome-grid">
            <div class="info-tile">
                <div class="label">Status Hari Ini</div>
                <div id="status-beranda">
                    <span class="status-badge belum">Belum absen</span>
                </div>
                <div class="sub" id="status-detail-beranda">Silakan lakukan absen masuk.</div>
            </div>
            <div class="info-tile">
                <div class="label">Lokasi Kantor</div>
                <div class="value">BPKK Kendari</div>
                <div class="sub">Radius maksimal 500 meter dari titik kantor.</div>
            </div>
        </div>

        <div class="card">
            <h3 style="margin:0 0 14px; font-size:16px;">Aksi Cepat</h3>
            <div class="quick-actions">
                <button class="quick-btn" id="quick-absen-masuk" type="button">
                    <span class="q-icon">📍</span> Absen Masuk
                </button>
                <button class="quick-btn" id="quick-absen-pulang" type="button" disabled>
                    <span class="q-icon">🏁</span> Absen Pulang
                </button>
                <button class="quick-btn" id="quick-lihat-rekap" type="button">
                    <span class="q-icon">📊</span> Lihat Rekap
                </button>
            </div>
        </div>

        <div class="card">
            <h3 style="margin:0 0 14px; font-size:16px;">Ringkasan Bulan Ini</h3>
            <div class="mini-stats">
                <div class="mini-stat"><strong id="mini-hadir">0</strong><small>Hadir</small></div>
                <div class="mini-stat"><strong id="mini-terlambat">0</strong><small>Terlambat</small></div>
                <div class="mini-stat"><strong id="mini-izin">0</strong><small>Izin/Sakit/Cuti</small></div>
                <div class="mini-stat"><strong id="mini-tanpa">0</strong><small>Tanpa Ket.</small></div>
            </div>
        </div>
    `;
}

function inisialisasiBeranda() {
    updateJamBeranda();
    let interval = setInterval(() => {
        if (!$('jam-beranda')) return clearInterval(interval);
        updateJamBeranda();
    }, 1000);

    $('quick-absen-masuk').onclick = () => navigasiKe('absen');
    $('quick-absen-pulang').onclick = () => {
        navigasiKe('absen');
        setTimeout(() => bukaTab('pulang'), 50);
    };
    $('quick-lihat-rekap').onclick = () => navigasiKe('rekap');

    perbaruiStatusBeranda();
    renderMiniStats();
}

function updateJamBeranda() {
    const el = $('jam-beranda'); const tgl = $('tanggal-beranda');
    if (!el || !tgl) return;
    const now = new Date();
    el.textContent = now.toLocaleTimeString('id-ID', { hour12: false });
    tgl.textContent = formatTanggalPanjang(now);
}

function perbaruiStatusBeranda() {
    if (!pegawaiAktif) return;
    const record = bacaAbsensi().find(r => r.pegawaiId === pegawaiAktif.id && r.tanggal === tanggalHariIni());
    const badge = $('status-beranda'); const detail = $('status-detail-beranda'); const btnPulang = $('quick-absen-pulang');
    if (!badge || !detail) return;

    let kelas = 'belum'; let label = 'Belum absen'; let ket = 'Silakan lakukan absen masuk.';

    if (record) {
        if (record.status === 'hadir') {
            if (record.jamPulang) {
                kelas = 'selesai'; label = 'Selesai'; ket = `Masuk ${record.jamMasuk} • Pulang ${record.jamPulang}`;
            } else {
                kelas = 'hadir'; label = 'Sudah masuk'; ket = `Masuk pukul ${record.jamMasuk}. Jangan lupa absen pulang.`;
            }
        } else {
            kelas = record.status; label = record.status.toUpperCase(); ket = record.alasan || 'Tercatat.';
        }
    }

    badge.innerHTML = `<span class="status-badge ${kelas}">${label}</span>`;
    detail.textContent = ket;
    if (btnPulang) btnPulang.disabled = !(record && record.status === 'hadir' && !record.jamPulang);
}

function renderMiniStats() {
    if (!pegawaiAktif) return;
    const now = new Date();
    const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const records = bacaAbsensi().filter(r => r.pegawaiId === pegawaiAktif.id && r.tanggal.startsWith(prefix));

    const hadir = records.filter(r => r.status === 'hadir').length;
    const terlambat = records.filter(r => r.statusWaktu === 'terlambat').length;
    const izin = records.filter(r => ['izin', 'sakit', 'cuti'].includes(r.status)).length;

    let hariKerja = 0;
    for (let d = 1; d <= now.getDate(); d++) {
        const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
        if (day !== 0 && day !== 6) hariKerja++;
    }
    const tanpa = Math.max(0, hariKerja - records.length);

    $('mini-hadir').textContent = hadir;
    $('mini-terlambat').textContent = terlambat;
    $('mini-izin').textContent = izin;
    $('mini-tanpa').textContent = tanpa;
}

/* ============================================================
   HALAMAN ABSEN (Desain Baru)
   ============================================================ */
function renderAbsen() {
    const nama = pegawaiAktif ? pegawaiAktif.nama : 'Memuat...';
    const jabatan = pegawaiAktif ? `${pegawaiAktif.jabatan} • ${pegawaiAktif.id}` : 'Memuat posisi...';

    return `
        <div class="header-card">
            <div>
                <h2>${nama}</h2>
                <p>${jabatan}</p>
            </div>
            <div class="datetime-box">
                <h3 id="jam-digital">00:00:00</h3>
                <span id="tanggal-digital"></span>
            </div>
        </div>

        <div class="location-banner" id="banner-lokasi">
            <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            <span id="teks-banner-lokasi">Memeriksa radius kantor...</span>
        </div>

        <section class="card">
            <div class="tab-pill-container">
                <button class="tab-pill-btn active" id="btn-tab-masuk" type="button">
                    <span style="font-size:16px;">➔</span> Absen Masuk
                </button>
                <button class="tab-pill-btn" id="btn-tab-pulang" type="button" disabled>
                    <span style="font-size:16px;">➔</span> Absen Pulang
                </button>
            </div>

            <!-- FORM MASUK -->
            <div class="tab-content active" id="content-masuk">
                <div class="form-group" style="margin-top:0;">
                    <label for="status-kehadiran" style="font-size:15px; margin-bottom:10px; display:block;">Status Kehadiran</label>
                    <select class="form-control" id="status-kehadiran" required style="padding:14px; font-size:15px; border-radius:12px;">
                        <option value="hadir">Hadir di Kantor</option>
                        <option value="izin">Izin</option>
                        <option value="sakit">Sakit</option>
                        <option value="cuti">Cuti</option>
                    </select>
                </div>

                <!-- Area Izin (Sembunyi default) -->
                <div class="form-group" id="area-izin" hidden>
                    <label for="alasan-izin" class="label-required">Alasan Izin / Sakit / Cuti</label>
                    <textarea class="form-control" id="alasan-izin" placeholder="Tuliskan alasan tidak hadir..." style="min-height:110px; border-radius:12px;"></textarea>
                </div>

                <!-- Area Kamera (Tampil default) -->
                <div class="form-group" id="area-kamera-masuk" style="margin-top:24px;">
                    <label style="font-size:15px; margin-bottom:4px; display:block;">Foto Selfie Presensi</label>
                    <div id="dropzone-masuk" class="camera-dropzone">
                        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"></path></svg>
                        <span>Klik untuk membuka kamera</span>
                        <video id="video-masuk" autoplay playsinline hidden></video>
                    </div>

                    <div id="konfirmasi-masuk" class="camera-tools" hidden style="margin-top:12px; justify-content:center;">
                        <button type="button" id="btn-ulangi-masuk" class="btn-secondary">Ulangi Foto</button>
                        <button type="button" id="btn-gunakan-masuk" class="btn-primary">Gunakan Foto</button>
                    </div>
                    
                    <canvas id="canvas-masuk" hidden></canvas>
                    <div id="pesan-foto-masuk" class="notice"></div>
                </div>

                <button class="btn-submit" id="btn-absen-masuk" type="button" disabled style="padding:16px; font-size:15px; border-radius:12px; margin-top:24px;">Kirim Absen Masuk</button>
                <div id="pesan-masuk" class="notice" aria-live="polite"></div>
            </div>

            <!-- FORM PULANG -->
            <div class="tab-content" id="content-pulang">
                <p class="hint" id="hint-pulang">Absen masuk hadir harus tercatat terlebih dahulu.</p>

                <div class="form-group">
                    <label for="kegiatan-pulang" style="font-size:15px; margin-bottom:10px; display:block;">Kegiatan hari ini (wajib)</label>
                    <textarea class="form-control" id="kegiatan-pulang" placeholder="Tuliskan ringkasan kegiatan yang dilakukan hari ini..." style="min-height:110px; border-radius:12px;"></textarea>
                </div>

                <div class="form-group" id="area-kamera-pulang" style="margin-top:24px;">
                    <label style="font-size:15px; margin-bottom:4px; display:block;">Foto Selfie Absen Pulang</label>
                    <div id="dropzone-pulang" class="camera-dropzone">
                        <svg fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"></path></svg>
                        <span>Klik untuk membuka kamera</span>
                        <video id="video-pulang" autoplay playsinline hidden></video>
                    </div>

                    <div id="konfirmasi-pulang" class="camera-tools" hidden style="margin-top:12px; justify-content:center;">
                        <button type="button" id="btn-ulangi-pulang" class="btn-secondary">Ulangi Foto</button>
                        <button type="button" id="btn-gunakan-pulang" class="btn-primary">Gunakan Foto</button>
                    </div>
                    
                    <canvas id="canvas-pulang" hidden></canvas>
                    <div id="pesan-foto-pulang" class="notice"></div>
                </div>

                <button class="btn-submit" id="btn-absen-pulang" type="button" disabled style="padding:16px; font-size:15px; border-radius:12px; margin-top:24px;">Kirim Absen Pulang</button>
                <div id="pesan-pulang" class="notice" aria-live="polite"></div>
            </div>
        </section>
    `;
}

function inisialisasiAbsen() {
    // 1. Reset State
    fotoMasuk = ''; fotoPulang = ''; fotoSementara = { masuk: '', pulang: '' }; posisiTerakhir = null;
    updateJam();
    let interval = setInterval(() => {
        if (!$('jam-digital')) return clearInterval(interval);
        updateJam();
    }, 1000);

    // 2. Cek Lokasi & Tampilkan Banner
    const banner = $('banner-lokasi');
    PresensiLokasi.ambil(KANTOR, RADIUS_KANTOR).then(lokasi => {
        posisiTerakhir = lokasi;
        banner.className = 'location-banner';
        banner.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Anda berada di dalam radius kantor (Maks. 500m).`;
        if ($('status-kehadiran').value === 'hadir') $('btn-absen-masuk').disabled = !fotoMasuk;
    }).catch(err => {
        banner.className = 'location-banner error';
        banner.innerHTML = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg> ${err.message}`;
    });

    // 3. Event Listeners Navigasi & Form
    $('status-kehadiran').addEventListener('change', ubahStatusKehadiran);
    $('btn-tab-masuk').addEventListener('click', () => bukaTab('masuk'));
    $('btn-tab-pulang').addEventListener('click', () => bukaTab('pulang'));
    $('btn-absen-masuk').addEventListener('click', kirimAbsenMasuk);
    $('btn-absen-pulang').addEventListener('click', kirimAbsenPulang);
    $('kegiatan-pulang').addEventListener('input', perbaruiStatusHariIni);

    // 4. Event Kamera (Klik Dropzone / Video / Tombol)
    $('dropzone-masuk').addEventListener('click', () => { if($('video-masuk').hidden) bukaKamera('masuk'); });
    $('dropzone-pulang').addEventListener('click', () => { if($('video-pulang').hidden) bukaKamera('pulang'); });
    $('video-masuk').addEventListener('click', (e) => { e.stopPropagation(); ambilFotoLangsung('masuk'); });
    $('video-pulang').addEventListener('click', (e) => { e.stopPropagation(); ambilFotoLangsung('pulang'); });
    
    $('btn-ulangi-masuk').addEventListener('click', () => { $('dropzone-masuk').querySelector('img')?.remove(); bukaKamera('masuk'); });
    $('btn-gunakan-masuk').addEventListener('click', () => gunakanFoto('masuk'));
    $('btn-ulangi-pulang').addEventListener('click', () => { $('dropzone-pulang').querySelector('img')?.remove(); bukaKamera('pulang'); });
    $('btn-gunakan-pulang').addEventListener('click', () => gunakanFoto('pulang'));

    // 5. Set State Awal
    ubahStatusKehadiran(); 
    perbaruiStatusHariIni();
}

function ubahStatusKehadiran() {
    const status = $('status-kehadiran').value;
    const butuhFoto = (status === 'hadir'); // Hanya hadir yang butuh foto

    $('area-izin').hidden = butuhFoto;
    $('area-kamera-masuk').hidden = !butuhFoto;
    $('alasan-izin').required = !butuhFoto;

    if (butuhFoto) {
        $('btn-absen-masuk').textContent = 'Kirim Absen Masuk';
        $('btn-absen-masuk').disabled = !fotoMasuk || !posisiTerakhir;
    } else {
        $('btn-absen-masuk').textContent = `Kirim Pengajuan ${status.charAt(0).toUpperCase() + status.slice(1)}`;
        $('btn-absen-masuk').disabled = false;
    }
}

/* ============================================================
   FUNGSI KAMERA
   ============================================================ */
async function bukaKamera(target) {
    try {
        hentikanKamera();
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('Browser tidak mendukung akses kamera.');
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: false, video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } }
        });
        streamKamera = stream;
        
        const video = $(`video-${target}`);
        const dropzone = $(`dropzone-${target}`);
        if (!video) return;
        
        video.srcObject = stream;
        video.hidden = false;
        dropzone.querySelector('svg').style.display = 'none';
        dropzone.querySelector('span').style.display = 'none';
        $(`konfirmasi-${target}`).hidden = true;
        await video.play();
    } catch (error) {
        hentikanKamera();
        setPesan(`pesan-foto-${target}`, error.message || 'Kamera tidak dapat dibuka.', 'error');
    }
}

function hentikanKamera() {
    if (streamKamera) {
        streamKamera.getTracks().forEach(t => t.stop());
        streamKamera = null;
    }
}

function ambilFotoLangsung(target) {
    const video = $(`video-${target}`);
    const canvas = $(`canvas-${target}`);
    const dropzone = $(`dropzone-${target}`);
    if (!video || !video.videoWidth) return setPesan(`pesan-foto-${target}`, 'Kamera belum siap.', 'error');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    fotoSementara[target] = canvas.toDataURL('image/jpeg', 0.62);
    
    video.hidden = true;
    let img = dropzone.querySelector('img');
    if (!img) { img = document.createElement('img'); dropzone.appendChild(img); }
    img.src = fotoSementara[target];
    
    $(`konfirmasi-${target}`).hidden = false;
    hentikanKamera();
    setPesan(`pesan-foto-${target}`, 'Foto berhasil diambil. Periksa hasilnya.', 'success');
}

function gunakanFoto(target) {
    if (!fotoSementara[target]) return setPesan(`pesan-foto-${target}`, 'Ambil foto terlebih dahulu.', 'error');
    
    if (target === 'masuk') {
        fotoMasuk = fotoSementara.masuk;
        $('btn-absen-masuk').disabled = !posisiTerakhir; // Aktif jika lokasi valid
    } else {
        fotoPulang = fotoSementara.pulang;
        perbaruiStatusHariIni();
    }
    
    $(`konfirmasi-${target}`).hidden = true;
    setPesan(`pesan-foto-${target}`, 'Foto dikonfirmasi dan siap digunakan.', 'success');
}

/* ============================================================
   FUNGSI ABSEN & VALIDASI
   ============================================================ */
function statusTerlambat(jam) { return jam > BATAS_TERLAMBAT ? 'terlambat' : 'hadir'; }

async function kirimAbsenMasuk() {
    const status = $('status-kehadiran').value;
    const butuhFoto = (status === 'hadir');
    const data = bacaAbsensi();

    // Validasi
    if (data.some(r => r.pegawaiId === pegawaiAktif.id && r.tanggal === tanggalHariIni())) {
        return setPesan('pesan-masuk', 'Anda sudah mengisi absensi hari ini.', 'error');
    }
    if (butuhFoto && !fotoMasuk) return setPesan('pesan-masuk', 'Foto selfie wajib dilampirkan.', 'error');
    if (butuhFoto && !posisiTerakhir) return setPesan('pesan-masuk', 'Lokasi belum valid.', 'error');
    
    let alasan = '';
    if (!butuhFoto) {
        alasan = $('alasan-izin').value.trim();
        if (!alasan) return setPesan('pesan-masuk', 'Alasan wajib diisi.', 'error');
    }

    const jam = waktuSekarang();
    const record = {
        id: `ABS-${Date.now()}`,
        pegawaiId: pegawaiAktif.id,
        nama: pegawaiAktif.nama,
        jabatan: pegawaiAktif.jabatan,
        tanggal: tanggalHariIni(),
        status: status,
        statusWaktu: status === 'hadir' ? statusTerlambat(jam) : status,
        jamMasuk: butuhFoto ? jam : null,
        alasan: alasan,
        fotoMasuk: butuhFoto ? fotoMasuk : '',
        lokasiMasuk: posisiTerakhir,
        jamPulang: null, fotoPulang: '', kegiatan: ''
    };

    try { data.push(record); simpanAbsensi(data); } 
    catch (e) { return setPesan('pesan-masuk', 'Penyimpanan penuh.', 'error'); }

    setPesan('pesan-masuk', `Absensi ${status.toUpperCase()} berhasil pukul ${jam}.`, 'success');
    perbaruiStatusHariIni();
}

async function kirimAbsenPulang() {
    const kegiatan = $('kegiatan-pulang').value.trim();
    if (kegiatan.length < 5) return setPesan('pesan-pulang', 'Isi kegiatan minimal 5 karakter.', 'error');
    if (!fotoPulang) return setPesan('pesan-pulang', 'Foto selfie wajib dilampirkan.', 'error');

    const data = bacaAbsensi();
    const record = data.find(r => r.pegawaiId === pegawaiAktif.id && r.tanggal === tanggalHariIni());
    
    if (!record) return setPesan('pesan-pulang', 'Belum absen masuk hari ini.', 'error');
    if (record.status !== 'hadir') return setPesan('pesan-pulang', 'Tidak berlaku untuk izin/sakit/cuti.', 'error');
    if (record.jamPulang) return setPesan('pesan-pulang', 'Absen pulang sudah tercatat.', 'error');
    if (!posisiTerakhir) return setPesan('pesan-pulang', 'Lokasi belum valid.', 'error');

    record.jamPulang = waktuSekarang();
    record.kegiatan = kegiatan;
    record.fotoPulang = fotoPulang;
    record.lokasiPulang = posisiTerakhir;

    try { simpanAbsensi(data); } 
    catch (e) { return setPesan('pesan-pulang', 'Penyimpanan penuh.', 'error'); }

    setPesan('pesan-pulang', `Absen pulang berhasil pukul ${record.jamPulang}.`, 'success');
    perbaruiStatusHariIni();
}

function bukaTab(tipe) {
    if (tipe === 'pulang' && $('btn-tab-pulang')?.disabled) return;
    document.querySelectorAll('.tab-pill-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    $(tipe === 'masuk' ? 'btn-tab-masuk' : 'btn-tab-pulang')?.classList.add('active');
    $(`content-${tipe}`)?.classList.add('active');
}

function perbaruiStatusHariIni() {
    if (!pegawaiAktif) return;
    const record = bacaAbsensi().find(r => r.pegawaiId === pegawaiAktif.id && r.tanggal === tanggalHariIni());
    
    // Tombol Pulang
    const bolehPulang = !!record && record.status === 'hadir' && !record.jamPulang;
    if ($('btn-tab-pulang')) $('btn-tab-pulang').disabled = !bolehPulang;
    
    const btnPulang = $('btn-absen-pulang');
    if (btnPulang) {
        btnPulang.disabled = !bolehPulang || $('kegiatan-pulang').value.trim().length < 5 || !fotoPulang || !posisiTerakhir;
    }
    
    // Teks Hint
    const hint = $('hint-pulang');
    if (hint) {
        if (!record || record.status !== 'hadir') hint.textContent = 'Absen masuk hadir harus tercatat terlebih dahulu.';
        else if (record.jamPulang) hint.textContent = 'Absensi hari ini sudah selesai.';
        else hint.textContent = 'Isi kegiatan dan lampirkan foto untuk mengaktifkan absen pulang.';
    }

    // Jika sudah absen, langsung blokir form masuk
    if (record && $('content-masuk')) {
        $('btn-absen-masuk').disabled = true;
        $('btn-absen-masuk').textContent = 'Sudah Absen Hari Ini';
    }
}

/* ============================================================
   REKAP & INISIALISASI GLOBAL
   ============================================================ */
function renderRekap() {
    // ... (Gunakan fungsi renderRekap() dari jawaban sebelumnya) ...
    // Saya singkat di sini karena tidak ada perubahan visual
    return `
        <div class="header-card">
            <div><h2>Rekapitulasi Absensi</h2><p>Ringkasan kehadiran Anda berdasarkan bulan yang dipilih.</p></div>
        </div>
        <section class="card">
            <div class="form-group" style="margin:0;">
                <label for="filter-bulan">Pilih bulan</label>
                <input type="month" id="filter-bulan" class="form-control" style="max-width:260px;">
            </div>
        </section>
        <section class="rekap-grid">
            <div class="stat"><small>Jumlah Hadir</small><strong id="jumlah-hadir">0</strong></div>
            <div class="stat"><small>Jumlah Terlambat</small><strong id="jumlah-terlambat">0</strong></div>
            <div class="stat"><small>Jumlah Tidak Hadir</small><strong id="jumlah-tidak-hadir">0</strong></div>
        </section>
        <section class="card">
            <h3 style="margin:0 0 14px; font-size:16px;">Rincian Tidak Hadir</h3>
            <div class="substats">
                <div class="sub">Izin<strong id="jumlah-izin">0</strong></div>
                <div class="sub">Sakit<strong id="jumlah-sakit">0</strong></div>
                <div class="sub">Cuti<strong id="jumlah-cuti">0</strong></div>
                <div class="sub">Tanpa Keterangan<strong id="jumlah-tanpa-keterangan">0</strong></div>
            </div>
        </section>
        <section class="card">
            <h3 style="margin:0 0 14px; font-size:16px;">Riwayat Absensi</h3>
            <div class="table-wrap">
                <table>
                    <thead><tr><th>Tanggal</th><th>Status</th><th>Jam Masuk</th><th>Jam Pulang</th><th>Keterangan</th><th>Alasan / Kegiatan</th></tr></thead>
                    <tbody id="tabel-riwayat"></tbody>
                </table>
            </div>
        </section>
    `;
}

function inisialisasiRekap() {
    if (typeof window.renderRekapData === 'function') window.renderRekapData();
    else renderRekapFallback();
}

function renderRekapFallback() {
    const pegawaiId = localStorage.getItem(SESSION_KEY) || (pegawaiAktif && pegawaiAktif.id);
    const input = $('filter-bulan');
    const now = new Date();
    if (input && !input.value) input.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (input) input.onchange = renderRekapFallback; // pakai onchange, bukan addEventListener agar tidak dobel
    if (!input || !input.value) return;

    const [year, month] = input.value.split('-').map(Number);
    const today = new Date();
    const lastDay = new Date(year, month, 0).getDate();
    const sampai = year === today.getFullYear() && month === today.getMonth() + 1 ? today.getDate() : (new Date(year, month - 1, 1) > today ? 0 : lastDay);
    
    const records = bacaAbsensi().filter(x => x.pegawaiId === pegawaiId && x.tanggal.startsWith(`${year}-${String(month).padStart(2, '0')}`));
    
    let hariKerja = 0;
    for (let d = 1; d <= sampai; d++) { const day = new Date(year, month - 1, d).getDay(); if (day !== 0 && day !== 6) hariKerja++; }

    const hadir = records.filter(x => x.status === 'hadir').length;
    const terlambat = records.filter(x => x.statusWaktu === 'terlambat').length;
    const izin = records.filter(x => x.status === 'izin').length;
    const sakit = records.filter(x => x.status === 'sakit').length;
    const cuti = records.filter(x => x.status === 'cuti').length;
    const tanpa = Math.max(0, hariKerja - records.length);

    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set('jumlah-hadir', hadir); set('jumlah-terlambat', terlambat); set('jumlah-tidak-hadir', izin + sakit + cuti + tanpa);
    set('jumlah-izin', izin); set('jumlah-sakit', sakit); set('jumlah-cuti', cuti); set('jumlah-tanpa-keterangan', tanpa);

    const escape = (v) => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const tbody = $('tabel-riwayat');
    if (!tbody) return;
    
    const rows = records.sort((a, b) => b.tanggal.localeCompare(a.tanggal)).map(x => `
        <tr>
            <td>${new Date(x.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</td>
            <td>${x.status.toUpperCase()}</td>
            <td>${x.jamMasuk || '-'}</td>
            <td>${x.jamPulang || '-'}</td>
            <td>${x.statusWaktu === 'terlambat' ? 'Terlambat' : x.status === 'hadir' ? 'Tepat waktu' : '-'}</td>
            <td>${escape(x.alasan || x.kegiatan || '-')}</td>
        </tr>
    `).join('');
    tbody.innerHTML = rows || '<tr><td colspan="6" class="empty">Belum ada data absensi pada bulan ini.</td></tr>';
}

async function init() {
    try {
        const list = await muatPegawai();
        if (!Array.isArray(list) || !list.length) throw new Error('Data pegawai masih kosong.');
        const saved = localStorage.getItem(SESSION_KEY);
        pegawaiAktif = list.find(p => p.id === saved) || list[0];
        if (!saved || !list.some(p => p.id === saved)) localStorage.setItem(SESSION_KEY, pegawaiAktif.id);
    } catch (error) {
        $('app-main').innerHTML = `<div class="card" style="color:#b91c1c;background:#fef2f2;border-color:#fecaca;">${error.message}</div>`;
        return;
    }

    $('btn-keluar').onclick = () => {
        hentikanKamera();
        localStorage.removeItem(SESSION_KEY);
        location.href = 'index.html';
    };

    window.addEventListener('hashchange', () => tampilkanHalaman(halamanDariHash()));
    
    if (!location.hash) location.replace(`#${HALAMAN_DEFAULT}`);
    else tampilkanHalaman(halamanDariHash());
}

window.addEventListener('beforeunload', hentikanKamera);
document.addEventListener('DOMContentLoaded', init);