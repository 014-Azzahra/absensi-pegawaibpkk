/* Panel Admin - semua data diambil dari backend lewat REST API (fetch). */
if (!Api.wajibPeran('admin')) throw new Error('Belum login sebagai admin.');

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const bulanIni = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`; };
const pesanError = (e) => { if (e && e.message !== 'Sesi berakhir.') alert(e.message || 'Terjadi kesalahan.'); };
const barisKosong = (kolom, teks, warna = 'var(--muted)') => `<tr><td colspan="${kolom}" style="text-align:center; color:${warna}; padding:30px;">${esc(teks)}</td></tr>`;

// Navigasi Halaman
function switchPage(page, el) {
    document.querySelectorAll('.page-section').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
    $(`page-${page}`).classList.add('active');
    if (page !== 'detail-harian' && el) el.classList.add('active');

    if (page === 'beranda') loadBeranda();
    if (page === 'rekap') renderKalender();
    if (page === 'akun') renderDaftarAkun();
    if (page === 'pengaturan') muatPengaturan();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ==========================================
// BERANDA (GET /api/admin/dashboard)
// ==========================================
async function loadBeranda() {
    try {
        const d = await Api.get(`/api/admin/dashboard?bulan=${bulanIni()}`);
        $('dash-hadir').textContent = d.total.hadir;
        $('dash-terlambat').textContent = d.total.terlambat;
        $('dash-izin').textContent = d.total.izin + d.total.sakit + d.total.cuti;
        $('dash-absen').textContent = d.total.tanpaKeterangan;

        $('tabel-aktivitas').innerHTML = d.terbaru.length === 0
            ? barisKosong(4, 'Belum ada aktivitas absensi.')
            : d.terbaru.map(a => `
                <tr>
                    <td>${new Date(a.tanggal + 'T00:00:00').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td>${a.jamPulang || a.jamMasuk || '-'}</td>
                    <td style="font-weight:600;">${esc(a.nama)}</td>
                    <td>${a.jamPulang ? 'Absen Pulang' : (a.jamMasuk ? 'Absen Masuk' : esc(a.status.toUpperCase()))}</td>
                </tr>`).join('');
    } catch (e) { pesanError(e); }
}

// ==========================================
// KALENDER + REKAP BULANAN (GET /api/admin/absensi?bulan, /api/admin/rekap?bulan)
// ==========================================
async function renderKalender() {
    if (!$('filter-bulan-admin').value) $('filter-bulan-admin').value = bulanIni();
    const val = $('filter-bulan-admin').value;
    const [year, month] = val.split('-').map(Number);

    let absen = [], rekap;
    try {
        [absen, rekap] = await Promise.all([
            Api.get(`/api/admin/absensi?bulan=${val}`).then(r => r.data),
            Api.get(`/api/admin/rekap?bulan=${val}`),
        ]);
    } catch (e) { return pesanError(e); }
    if ($('filter-bulan-admin').value !== val) return;     // bulan diganti saat menunggu

    // --- kalender
    const perTanggal = {};
    absen.forEach(a => (perTanggal[a.tanggal] = perTanggal[a.tanggal] || []).push(a));
    const firstDay = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();
    let html = '<div class="kalender-cell empty"></div>'.repeat(firstDay === 0 ? 6 : firstDay - 1);

    for (let d = 1; d <= totalDays; d++) {
        const dow = new Date(year, month - 1, d).getDay();
        const tglStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        if (dow === 0 || dow === 6) {
            html += `<div class="kalender-cell libur" title="Hari Libur"><div class="tgl-num">${d}</div></div>`;
            continue;
        }
        const hari = perTanggal[tglStr] || [];
        let dot = '';
        if (hari.some(a => a.status === 'hadir')) dot += '<div class="dot dot-hadir"></div>';
        if (hari.some(a => a.status !== 'hadir')) dot += '<div class="dot dot-izin"></div>';
        html += `<div class="kalender-cell kerja" onclick="bukaDetailHarian('${tglStr}')"><div class="tgl-num">${d}</div><div class="indikator">${dot}</div></div>`;
    }
    $('kalender-grid').innerHTML = html;

    // --- rekap seluruh pegawai
    const namaBulan = new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    $('info-rekap-bulan').textContent = `${namaBulan} • ${rekap.hariKerja} hari kerja (Senin-Jumat) sampai hari ini`;
    $('tabel-rekap-bulanan').innerHTML = rekap.pegawai.length === 0 ? barisKosong(9, 'Belum ada pegawai.') :
        rekap.pegawai.map(p => `
            <tr>
                <td>${esc(p.kode)}</td>
                <td style="font-weight:600;">${esc(p.nama)}</td>
                <td>${esc(p.jabatan)}</td>
                <td>${p.hadir}</td><td>${p.terlambat}</td><td>${p.izin}</td><td>${p.sakit}</td><td>${p.cuti}</td>
                <td style="color:${p.tanpaKeterangan ? 'var(--red)' : 'inherit'}; font-weight:${p.tanpaKeterangan ? 700 : 400};">${p.tanpaKeterangan}</td>
            </tr>`).join('') + `
            <tr style="font-weight:700; background:#f8fafc;">
                <td colspan="3">TOTAL</td>
                <td>${rekap.total.hadir}</td><td>${rekap.total.terlambat}</td><td>${rekap.total.izin}</td>
                <td>${rekap.total.sakit}</td><td>${rekap.total.cuti}</td><td>${rekap.total.tanpaKeterangan}</td>
            </tr>`;
}

// ==========================================
// DETAIL HARIAN (GET /api/admin/absensi?tanggal)
// ==========================================
async function bukaDetailHarian(tglStr) {
    switchPage('detail-harian', null);
    $('judul-harian').textContent = `Kehadiran: ${new Date(tglStr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;
    $('tabel-harian-admin').innerHTML = barisKosong(7, 'Memuat data...');
    $('harian-hadir').textContent = $('harian-terlambat').textContent = $('harian-izin').textContent = '0';

    let absen;
    try { absen = (await Api.get(`/api/admin/absensi?tanggal=${tglStr}`)).data; }
    catch (e) { $('tabel-harian-admin').innerHTML = barisKosong(7, e.message, 'var(--red)'); return; }

    $('harian-hadir').textContent = absen.filter(a => a.status === 'hadir').length;
    $('harian-terlambat').textContent = absen.filter(a => a.statusWaktu === 'terlambat').length;
    $('harian-izin').textContent = absen.filter(a => a.status !== 'hadir').length;

    if (absen.length === 0) { $('tabel-harian-admin').innerHTML = barisKosong(7, 'Belum ada pegawai yang absen pada tanggal ini.'); return; }

    $('tabel-harian-admin').innerHTML = absen.map(a => {
        let badge = 'badge-hadir';
        if (a.status === 'izin' || a.status === 'cuti') badge = 'badge-izin';
        if (a.status === 'sakit') badge = 'badge-absen';
        if (a.statusWaktu === 'terlambat') badge = 'badge-terlambat';

        const ket = a.status === 'hadir'
            ? (a.kegiatan ? `<strong>Kegiatan:</strong> ${esc(a.kegiatan)}` : '<em>Tidak ada kegiatan</em>')
            : `<strong>Alasan:</strong> ${esc(a.alasan || '-')}`;

        let aksi = '';
        if (a.fotoMasuk) aksi += `<button class="btn-aksi" onclick="showFoto('${esc(a.fotoMasuk)}')">Foto Masuk</button> `;
        if (a.fotoPulang) aksi += `<button class="btn-aksi" style="margin-top:4px;" onclick="showFoto('${esc(a.fotoPulang)}')">Foto Pulang</button> `;
        aksi += `<button class="btn-aksi btn-danger" style="margin-top:4px;" onclick="hapusAbsen(${a.id}, '${tglStr}')">Hapus</button>`;

        return `
            <tr>
                <td style="font-weight:600;">${esc(a.nama)}</td>
                <td>${esc(a.jabatan)}</td>
                <td>${a.jamMasuk || '-'}</td>
                <td>${a.jamPulang || '-'}</td>
                <td><span class="badge ${badge}">${a.statusWaktu === 'terlambat' ? 'TERLAMBAT' : esc(a.status.toUpperCase())}</span></td>
                <td style="max-width:250px; font-size:13px;">${ket}</td>
                <td>${aksi}</td>
            </tr>`;
    }).join('');
}

async function hapusAbsen(id, tglStr) {
    if (!confirm('Apakah Anda yakin ingin menghapus data absensi pegawai ini?')) return;
    try { await Api.del(`/api/admin/absensi/${id}`); bukaDetailHarian(tglStr); }
    catch (e) { pesanError(e); }
}

// ==========================================
// UNDUH REKAP (GET /api/admin/rekap/export)
// ==========================================
async function unduhRekap(format) {
    const val = $('filter-bulan-admin').value;
    if (!val) return alert('Pilih bulan terlebih dahulu!');
    try {
        await Api.unduh(`/api/admin/rekap/export?bulan=${val}&format=${format}&jenis=detail`, `rekap-absensi-${val}.${format}`);
    } catch (e) { pesanError(e); }
}

// ==========================================
// KELOLA AKUN (CRUD /api/admin/pegawai)
// ==========================================
async function renderDaftarAkun() {
    try {
        const { data } = await Api.get('/api/admin/pegawai');
        $('tabel-akun').innerHTML = data.length === 0 ? barisKosong(4, 'Belum ada akun pegawai.') : data.map(p => `
            <tr>
                <td><strong>${esc(p.username)}</strong><br><small style="color:var(--muted);">${esc(p.kode)}</small></td>
                <td>${esc(p.nama)}</td>
                <td>${esc(p.jabatan)}</td>
                <td>
                    <button class="btn-aksi" onclick="ubahAkun(${p.id})">Ubah</button>
                    <button class="btn-aksi btn-danger" onclick="hapusAkun(${p.id}, '${esc(p.nama).replace(/'/g, '&#39;')}')">Hapus</button>
                </td>
            </tr>`).join('');
    } catch (e) { pesanError(e); }
}

async function simpanAkunBaru(e) {
    e.preventDefault();
    try {
        const body = {
            kode: $('new-id').value.trim(), nama: $('new-nama').value.trim(), jabatan: $('new-jabatan').value.trim(),
            username: $('new-username').value.trim(), password: $('new-password').value,
        };
        const p = await Api.post('/api/admin/pegawai', body);
        alert('Akun berhasil dibuat! Pegawai bisa login dengan Username: ' + p.username);
        $('form-buat-akun').reset();
        renderDaftarAkun();
    } catch (err) { pesanError(err); }
}

async function ubahAkun(id) {
    try {
        const p = await Api.get(`/api/admin/pegawai/${id}`);
        const nama = prompt('Nama lengkap:', p.nama); if (nama === null) return;
        const jabatan = prompt('Bidang / Jabatan:', p.jabatan); if (jabatan === null) return;
        const password = prompt('Kata sandi baru (kosongkan jika tidak diubah, minimal 6 karakter):', ''); if (password === null) return;
        await Api.put(`/api/admin/pegawai/${id}`, { nama: nama.trim(), jabatan: jabatan.trim(), ...(password ? { password } : {}) });
        renderDaftarAkun();
    } catch (e) { pesanError(e); }
}

async function hapusAkun(id, nama) {
    if (!confirm(`Hapus akun "${nama}"? Seluruh riwayat absensi pegawai ini juga akan terhapus.`)) return;
    try { await Api.del(`/api/admin/pegawai/${id}`); renderDaftarAkun(); }
    catch (e) { pesanError(e); }
}

// ==========================================
// FOTO (GET /api/foto/:nama, butuh token)
// ==========================================
let fotoUrlAktif = null;
async function showFoto(nama) {
    try {
        if (fotoUrlAktif) URL.revokeObjectURL(fotoUrlAktif);
        fotoUrlAktif = await Api.urlFoto(nama);
        $('img-preview').src = fotoUrlAktif;
        $('modal-foto').classList.add('active');
    } catch (e) { pesanError(e); }
}

// ==========================================
// PENGATURAN PRESENSI (GET/PUT /api/admin/pengaturan)
// ==========================================
function perbaruiLinkMaps() {
    const lat = $('set-lat').value.trim(), lon = $('set-lon').value.trim();
    $('link-maps').href = `https://www.google.com/maps?q=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
}

async function muatPengaturan() {
    try {
        const p = await Api.get('/api/admin/pengaturan');
        $('set-lat').value = p.kantor.lat; $('set-lon').value = p.kantor.lon; $('set-radius').value = p.radiusMeter;
        $('set-masuk').value = p.jamMasuk; $('set-terlambat').value = p.batasTerlambat; $('set-pulang').value = p.jamPulang;
        $('pesan-pengaturan').textContent = '';
        perbaruiLinkMaps();
    } catch (e) { pesanError(e); }
}

async function simpanPengaturan(e) {
    e.preventDefault();
    const pesan = $('pesan-pengaturan');
    try {
        await Api.put('/api/admin/pengaturan', {
            lat: $('set-lat').value.trim().replace(',', '.'), lon: $('set-lon').value.trim().replace(',', '.'),
            radiusMeter: $('set-radius').value,
            jamMasuk: $('set-masuk').value, batasTerlambat: $('set-terlambat').value, jamPulang: $('set-pulang').value,
        });
        pesan.style.color = 'var(--green)'; pesan.textContent = '✓ Pengaturan tersimpan dan langsung berlaku.';
        muatPengaturan().then(() => { pesan.style.color = 'var(--green)'; pesan.textContent = '✓ Pengaturan tersimpan dan langsung berlaku.'; });
    } catch (err) { pesan.style.color = 'var(--red)'; pesan.textContent = err.message; }
}

function pakaiLokasiSaya() {
    if (!navigator.geolocation) return alert('Browser tidak mendukung GPS.');
    navigator.geolocation.getCurrentPosition((pos) => {
        $('set-lat').value = pos.coords.latitude.toFixed(6); $('set-lon').value = pos.coords.longitude.toFixed(6);
        perbaruiLinkMaps();
    }, () => alert('Lokasi tidak berhasil diperoleh. Izinkan akses lokasi di browser.'), { enableHighAccuracy: true, timeout: 15000 });
}

document.addEventListener('DOMContentLoaded', () => {
    loadBeranda();
    // Tempel "lat, lon" dari Google Maps di kolom latitude -> otomatis terpisah ke dua kolom
    $('set-lat').addEventListener('input', () => {
        const m = $('set-lat').value.match(/^\s*(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (m) { $('set-lat').value = m[1]; $('set-lon').value = m[2]; }
        perbaruiLinkMaps();
    });
    $('set-lon').addEventListener('input', perbaruiLinkMaps);
});
