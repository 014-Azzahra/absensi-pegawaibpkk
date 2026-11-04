const KEY_ABSENSI = 'bpkk_absensi_v2';
const KEY_USER = 'bpkk_user_aktif';
const $r = (id) => document.getElementById(id);
function getRecords() { return JSON.parse(localStorage.getItem(KEY_ABSENSI) || '[]'); }
function hariKerjaDalamBulan(year, month, sampaiTanggal) {
  let total = 0;
  for (let day = 1; day <= sampaiTanggal; day++) {
    const date = new Date(year, month, day).getDay();
    if (date !== 0 && date !== 6) total++;
  }
  return total;
}
function renderRekap() {
  const pegawaiId = localStorage.getItem(KEY_USER) || 'PPNPN001';
  const [year, month] = $r('filter-bulan').value.split('-').map(Number);
  const today = new Date();
  const lastDay = new Date(year, month, 0).getDate();
  const sampai = year === today.getFullYear() && month === today.getMonth() + 1 ? today.getDate() : (new Date(year, month - 1, 1) > today ? 0 : lastDay);
  const records = getRecords().filter(x => x.pegawaiId === pegawaiId && x.tanggal.startsWith(`${year}-${String(month).padStart(2,'0')}`));
  const hadir = records.filter(x => x.status === 'hadir').length;
  const terlambat = records.filter(x => x.statusWaktu === 'terlambat').length;
  const izin = records.filter(x => x.status === 'izin').length;
  const sakit = records.filter(x => x.status === 'sakit').length;
  const cuti = records.filter(x => x.status === 'cuti').length;
  const tanpaKeterangan = Math.max(0, hariKerjaDalamBulan(year, month - 1, sampai) - records.length);
  $r('jumlah-hadir').textContent = hadir;
  $r('jumlah-terlambat').textContent = terlambat;
  $r('jumlah-tidak-hadir').textContent = izin + sakit + cuti + tanpaKeterangan;
  $r('jumlah-izin').textContent = izin;
  $r('jumlah-sakit').textContent = sakit;
  $r('jumlah-cuti').textContent = cuti;
  $r('jumlah-tanpa-keterangan').textContent = tanpaKeterangan;
  $r('tabel-riwayat').innerHTML = records.sort((a,b) => b.tanggal.localeCompare(a.tanggal)).map(x => `<tr><td>${new Date(`${x.tanggal}T00:00:00`).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}</td><td>${x.status.toUpperCase()}</td><td>${x.jamMasuk || '-'}</td><td>${x.jamPulang || '-'}</td><td>${x.statusWaktu === 'terlambat' ? 'Terlambat' : x.status === 'hadir' ? 'Tepat waktu' : '-'}</td><td>${escapeHtml(x.alasan || x.kegiatan || '-')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">Belum ada data absensi pada bulan ini.</td></tr>';
}
function escapeHtml(value) { return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
document.addEventListener('DOMContentLoaded', () => {
  const now = new Date();
  $r('filter-bulan').value = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  $r('filter-bulan').addEventListener('change', renderRekap);
  $r('btn-kembali').addEventListener('click', () => location.href = 'pegawai.html');
  renderRekap();
});
