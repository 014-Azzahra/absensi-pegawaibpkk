const STORAGE_ABSEN = 'bpkk_absensi_v2';
const STORAGE_PEGAWAI = 'bpkk_pegawai_v2';
const STORAGE_VERSI = 'bpkk_versi_data'; // Kunci untuk cek versi

// 30 Data Dummy Pegawai (Sesuai Bidang)
const dummyPegawai = [
    { id: 'PPNPN001', nama: 'Andi Pratama', jabatan: 'Kepegawaian', username: 'andi', password: '123' },
    { id: 'PPNPN002', nama: 'Sari Wulandari', jabatan: 'Kepegawaian', username: 'sari', password: '123' },
    { id: 'PPNPN003', nama: 'La Ode Rahman', jabatan: 'Kepegawaian', username: 'laode', password: '123' },
    { id: 'PPNPN004', nama: 'Budi Santoso', jabatan: 'Kepegawaian', username: 'budi', password: '123' },
    { id: 'PPNPN005', nama: 'Wa Ode Intan', jabatan: 'Keuangan', username: 'intan', password: '123' },
    { id: 'PPNPN006', nama: 'Rina Marlina', jabatan: 'Keuangan', username: 'rina', password: '123' },
    { id: 'PPNPN007', nama: 'Ahmad Fauzi', jabatan: 'Keuangan', username: 'fauzi', password: '123' },
    { id: 'PPNPN008', nama: 'Nur Aisyah', jabatan: 'Badan Milik Negara', username: 'aisyah', password: '123' },
    { id: 'PPNPN009', nama: 'Hasanuddin', jabatan: 'Badan Milik Negara', username: 'hasan', password: '123' },
    { id: 'PPNPN010', nama: 'Muh. Ilham', jabatan: 'Badan Milik Negara', username: 'ilham', password: '123' },
    { id: 'PPNPN011', nama: 'Fitriani', jabatan: 'IT/Medsos', username: 'fitri', password: '123' },
    { id: 'PPNPN012', nama: 'Reza Pahlevi', jabatan: 'IT/Medsos', username: 'reza', password: '123' },
    { id: 'PPNPN013', nama: 'Siti Rahma', jabatan: 'IT/Medsos', username: 'siti', password: '123' },
    { id: 'PPNPN014', nama: 'Joko Susilo', jabatan: 'Tenaga Kerja Mandiri', username: 'joko', password: '123' },
    { id: 'PPNPN015', nama: 'Dewi Lestari', jabatan: 'Tenaga Kerja Mandiri', username: 'dewi', password: '123' },
    { id: 'PPNPN016', nama: 'Agus Salim', jabatan: 'Tenaga Kerja Mandiri', username: 'agus', password: '123' },
    { id: 'PPNPN017', nama: 'Hj. Maryam', jabatan: 'Jejaring', username: 'maryam', password: '123' },
    { id: 'PPNPN018', nama: 'Yusuf Kalla', jabatan: 'Jejaring', username: 'yusuf', password: '123' },
    { id: 'PPNPN019', nama: 'Ani Yudhoyono', jabatan: 'Jejaring', username: 'ani', password: '123' },
    { id: 'PPNPN020', nama: 'Prabowo Subianto', jabatan: 'Perencanaan Program', username: 'prabowo', password: '123' },
    { id: 'PPNPN021', nama: 'Gibran Rakabuming', jabatan: 'Perencanaan Program', username: 'gibran', password: '123' },
    { id: 'PPNPN022', nama: 'Megawati', jabatan: 'Perencanaan Program', username: 'mega', password: '123' },
    { id: 'PPNPN023', nama: 'Ridwan Kamil', jabatan: 'Kepegawaian', username: 'ridwan', password: '123' },
    { id: 'PPNPN024', nama: 'Najwa Shihab', jabatan: 'IT/Medsos', username: 'najwa', password: '123' },
    { id: 'PPNPN025', nama: 'Raffi Ahmad', jabatan: 'Jejaring', username: 'raffi', password: '123' },
    { id: 'PPNPN026', nama: 'Baim Wong', jabatan: 'Keuangan', username: 'baim', password: '123' },
    { id: 'PPNPN027', nama: 'Rachel Vennya', jabatan: 'Badan Milik Negara', username: 'rachel', password: '123' },
    { id: 'PPNPN028', nama: 'Tretan Muslim', jabatan: 'Tenaga Kerja Mandiri', username: 'tretan', password: '123' },
    { id: 'PPNPN029', nama: 'Coki Pardede', jabatan: 'Perencanaan Program', username: 'coki', password: '123' },
    { id: 'PPNPN030', nama: 'Andre Taulany', jabatan: 'Kepegawaian', username: 'andre', password: '123' }
];

const $ = (id) => document.getElementById(id);
const getPegawai = () => JSON.parse(localStorage.getItem(STORAGE_PEGAWAI)) || dummyPegawai;
const savePegawai = (data) => localStorage.setItem(STORAGE_PEGAWAI, JSON.stringify(data));
const getAbsen = () => JSON.parse(localStorage.getItem(STORAGE_ABSEN)) || [];
const saveAbsen = (data) => localStorage.setItem(STORAGE_ABSEN, JSON.stringify(data));

// ==========================================
// TRIK MEMAKSA DATA BARU MUNCUL
// ==========================================
const versiSekarang = 'v2'; // Ubah string ini jika ingin me-reset data lagi nanti
if (localStorage.getItem(STORAGE_VERSI) !== versiSekarang) {
    savePegawai(dummyPegawai); // Timpa data lama dengan 30 data baru
    localStorage.setItem(STORAGE_VERSI, versiSekarang);
}

// Navigasi Halaman
function switchPage(page, el) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    
    document.getElementById(`page-${page}`).classList.add('active');
    
    if (page !== 'detail-harian') {
        el.classList.add('active');
    }

    if (page === 'beranda') loadBeranda();
    if (page === 'rekap') renderKalender();
    if (page === 'akun') renderDaftarAkun();
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// LOGIKA BERANDA
// ==========================================
function loadBeranda() {
    const pegawai = getPegawai();
    const absen = getAbsen();
    
    const now = new Date();
    const bulanIni = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const absenBulanIni = absen.filter(a => a.tanggal.startsWith(bulanIni));
    
    const hadir = absenBulanIni.filter(a => a.status === 'hadir').length;
    const terlambat = absenBulanIni.filter(a => a.statusWaktu === 'terlambat').length;
    const izin = absenBulanIni.filter(a => ['izin', 'sakit', 'cuti'].includes(a.status)).length;
    
    let hariKerja = 0;
    for (let d = 1; d <= now.getDate(); d++) {
        const day = new Date(now.getFullYear(), now.getMonth(), d).getDay();
        if (day !== 0 && day !== 6) hariKerja++;
    }
    const totalHarusHadir = hariKerja * pegawai.length;
    const tanpaKet = Math.max(0, totalHarusHadir - absenBulanIni.length);

    $('dash-hadir').textContent = hadir;
    $('dash-terlambat').textContent = terlambat;
    $('dash-izin').textContent = izin;
    $('dash-absen').textContent = tanpaKet;

    const aktivitas = [...absen].sort((a, b) => b.id - a.id).slice(0, 5);
    
    if (aktivitas.length === 0) {
        $('tabel-aktivitas').innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--muted); padding: 30px;">Belum ada aktivitas absensi.</td></tr>';
    } else {
        $('tabel-aktivitas').innerHTML = aktivitas.map(a => `
            <tr>
                <td>${new Date(a.tanggal).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
                <td>${a.jamMasuk || a.jamPulang || '-'}</td>
                <td style="font-weight:600;">${a.nama}</td>
                <td>${a.jamPulang ? 'Absen Pulang' : (a.jamMasuk ? 'Absen Masuk' : a.status.toUpperCase())}</td>
            </tr>
        `).join('');
    }
}

// ==========================================
// LOGIKA KALENDER REKAP
// ==========================================
function renderKalender() {
    const filter = $('filter-bulan-admin').value;
    if (!filter) {
        const now = new Date();
        $('filter-bulan-admin').value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        return renderKalender();
    }

    const val = $('filter-bulan-admin').value;
    const [year, month] = val.split('-').map(Number);
    
    const firstDay = new Date(year, month - 1, 1).getDay(); 
    const totalDays = new Date(year, month, 0).getDate();
    let startOffset = firstDay === 0 ? 6 : firstDay - 1; 

    let html = '';

    for (let i = 0; i < startOffset; i++) {
        html += `<div class="kalender-cell empty"></div>`;
    }

    for (let d = 1; d <= totalDays; d++) {
        const dateObj = new Date(year, month - 1, d);
        const dayOfWeek = dateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const tglStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

        const absenHariIni = getAbsen().filter(a => a.tanggal === tglStr);
        const adaHadir = absenHariIni.some(a => a.status === 'hadir');
        const adaIzin = absenHariIni.some(a => a.status !== 'hadir');

        let dotHtml = '';
        if (adaHadir) dotHtml += '<div class="dot dot-hadir"></div>';
        if (adaIzin) dotHtml += '<div class="dot dot-izin"></div>';

        if (isWeekend) {
            html += `
                <div class="kalender-cell libur" title="Hari Libur">
                    <div class="tgl-num">${d}</div>
                </div>
            `;
        } else {
            html += `
                <div class="kalender-cell kerja" onclick="bukaDetailHarian('${tglStr}')">
                    <div class="tgl-num">${d}</div>
                    <div class="indikator">${dotHtml}</div>
                </div>
            `;
        }
    }

    document.getElementById('kalender-grid').innerHTML = html;
}

// ==========================================
// LOGIKA DETAIL HARIAN
// ==========================================
function bukaDetailHarian(tglStr) {
    switchPage('detail-harian', null);
    
    const dateObj = new Date(tglStr);
    const dateFormat = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    $('judul-harian').textContent = `Kehadiran: ${dateFormat}`;

    const absen = getAbsen().filter(a => a.tanggal === tglStr);

    const hadir = absen.filter(a => a.status === 'hadir').length;
    const terlambat = absen.filter(a => a.statusWaktu === 'terlambat').length;
    const izin = absen.filter(a => ['izin', 'sakit', 'cuti'].includes(a.status)).length;

    $('harian-hadir').textContent = hadir;
    $('harian-terlambat').textContent = terlambat;
    $('harian-izin').textContent = izin;

    if (absen.length === 0) {
        $('tabel-harian-admin').innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Belum ada pegawai yang absen pada tanggal ini.</td></tr>';
    } else {
        $('tabel-harian-admin').innerHTML = absen.map(a => {
            let badgeClass = 'badge-hadir';
            if (a.status === 'izin' || a.status === 'cuti') badgeClass = 'badge-izin';
            if (a.status === 'sakit') badgeClass = 'badge-absen';
            if (a.statusWaktu === 'terlambat') badgeClass = 'badge-terlambat';

            let ket = '-';
            if (a.status === 'hadir') ket = a.kegiatan ? `<strong>Kegiatan:</strong> ${a.kegiatan}` : '<em>Tidak ada kegiatan</em>';
            else ket = `<strong>Alasan:</strong> ${a.alasan || '-'}`;

            let btnAksi = '';
            if (a.fotoMasuk && a.fotoPulang) {
                btnAksi += `
                    <button class="btn-aksi" onclick="showFoto('${a.fotoMasuk}')">Foto Masuk</button>
                    <button class="btn-aksi" style="margin-top:4px;" onclick="showFoto('${a.fotoPulang}')">Foto Pulang</button>
                `;
            } else if (a.fotoMasuk) {
                btnAksi += `<button class="btn-aksi" onclick="showFoto('${a.fotoMasuk}')">Foto Masuk</button>`;
            } else if (a.fotoPulang) {
                btnAksi += `<button class="btn-aksi" onclick="showFoto('${a.fotoPulang}')">Foto Pulang</button>`;
            }
            
            btnAksi += `
                <button class="btn-aksi btn-danger" style="margin-top:4px;" onclick="hapusAbsen('${a.id}', '${tglStr}')">Hapus</button>
            `;

            return `
                <tr>
                    <td style="font-weight:600;">${a.nama}</td>
                    <td>${a.jabatan}</td>
                    <td>${a.jamMasuk || '-'}</td>
                    <td>${a.jamPulang || '-'}</td>
                    <td><span class="badge ${badgeClass}">${a.statusWaktu === 'terlambat' ? 'TERLAMBAT' : a.status.toUpperCase()}</span></td>
                    <td style="max-width:250px; font-size:13px;">${ket}</td>
                    <td>${btnAksi}</td>
                </tr>
            `;
        }).join('');
    }
}

// ==========================================
// LOGIKA HAPUS ABSEN
// ==========================================
function hapusAbsen(id, tglStr) {
    if (!confirm('Apakah Anda yakin ingin menghapus data absensi pegawai ini?')) return;
    
    let absen = getAbsen();
    absen = absen.filter(a => a.id !== id);
    saveAbsen(absen);
    
    alert('Data absensi berhasil dihapus.');
    bukaDetailHarian(tglStr);
}

// ==========================================
// UNDUH EXCEL
// ==========================================
function unduhExcel() {
    const val = $('filter-bulan-admin').value;
    if (!val) return alert('Pilih bulan terlebih dahulu!');

    const absen = getAbsen().filter(a => a.tanggal.startsWith(val));
    
    if (absen.length === 0) {
        return alert('Tidak ada data absensi untuk bulan ini.');
    }

    absen.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

    let tableHtml = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
            <meta charset="utf-8">
            <style>
                table { border-collapse: collapse; width: 100%; font-family: sans-serif; }
                th, td { border: 1px solid #000; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; font-weight: bold; }
            </style>
        </head>
        <body>
            <h3>Rekap Kehadiran Pegawai - Bulan ${val}</h3>
            <table>
                <thead>
                    <tr>
                        <th>Tanggal</th>
                        <th>Nama Pegawai</th>
                        <th>Jabatan</th>
                        <th>Jam Masuk</th>
                        <th>Jam Pulang</th>
                        <th>Status</th>
                        <th>Keterangan</th>
                    </tr>
                </thead>
                <tbody>
    `;

    absen.forEach(a => {
        let ket = a.status === 'hadir' ? (a.kegiatan || '-') : (a.alasan || '-');
        let status = a.statusWaktu === 'terlambat' ? 'Terlambat' : a.status.toUpperCase();
        
        tableHtml += `
            <tr>
                <td>${a.tanggal}</td>
                <td>${a.nama}</td>
                <td>${a.jabatan}</td>
                <td>${a.jamMasuk || '-'}</td>
                <td>${a.jamPulang || '-'}</td>
                <td>${status}</td>
                <td>${ket}</td>
            </tr>
        `;
    });

    tableHtml += `
                </tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel' }); 
    const url = URL.createObjectURL(blob); 
    const link = document.createElement("a"); 
    link.setAttribute("href", url); 
    link.setAttribute("download", `Rekap_Absensi_${val}.xls`); 
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
}

// ==========================================
// LOGIKA KELOLA AKUN
// ==========================================
function renderDaftarAkun() {
    const pegawai = getPegawai();
    $('tabel-akun').innerHTML = pegawai.map((p, index) => `
        <tr>
            <td><strong>${p.username}</strong></td>
            <td>${p.nama}</td>
            <td>${p.jabatan}</td>
            <td>
                <button class="btn-aksi btn-danger" onclick="hapusAkun(${index})">Hapus</button>
            </td>
        </tr>
    `).join('');
}

function simpanAkunBaru(e) {
    e.preventDefault();
    const id = $('new-id').value.trim().toUpperCase();
    const nama = $('new-nama').value.trim();
    const jabatan = $('new-jabatan').value.trim();
    const username = $('new-username').value.trim().toLowerCase();
    const password = $('new-password').value.trim();

    const pegawai = getPegawai();
    
    if (pegawai.some(p => p.username === username)) {
        alert('Username sudah digunakan! Silakan gunakan username lain.');
        return;
    }

    pegawai.push({ id, nama, jabatan, username, password });
    savePegawai(pegawai);
    
    alert('Akun berhasil dibuat! Pegawai bisa login dengan Username: ' + username);
    $('form-buat-akun').reset();
    renderDaftarAkun();
}

function hapusAkun(index) {
    if (!confirm('Apakah Anda yakin ingin menghapus akun ini?')) return;
    const pegawai = getPegawai();
    pegawai.splice(index, 1);
    savePegawai(pegawai);
    renderDaftarAkun();
}

function showFoto(src) {
    $('img-preview').src = src;
    $('modal-foto').classList.add('active');
}

document.addEventListener('DOMContentLoaded', () => {
    loadBeranda();
});