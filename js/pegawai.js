/* Sistem Presensi PPNPN - logika halaman pegawai (Vanilla JavaScript) */
const STORAGE_KEY = 'bpkk_absensi_v2';
const SESSION_KEY = 'bpkk_user_aktif';
const BATAS_TERLAMBAT = '08:00';
const RADIUS_KANTOR = 500;
// Koordinat sementara titik kantor BPKK Kendari, Jl. Made Sabara No. 1.
// Cocokkan kembali pin Google Maps kantor sebelum sistem dipakai sungguhan.
const KANTOR = { lat: -3.9762, lon: 122.5144 };
let pegawaiAktif = null;
let fotoMasuk = '';
let fotoPulang = '';
let streamKamera = null;
let posisiTerakhir = null;

const $ = (id) => document.getElementById(id);
const bacaAbsensi = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
const simpanAbsensi = (data) => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
const tanggalHariIni = () => new Date().toLocaleDateString('en-CA');
const waktuSekarang = () => new Date().toTimeString().slice(0, 5);

async function muatPegawai() {
  const response = await fetch('js/data/pegawai.json');
  if (!response.ok) throw new Error('Data pegawai tidak dapat dimuat.');
  return response.json();
}

function updateJam() {
  const now = new Date();
  $('jam-digital').textContent = now.toLocaleTimeString('id-ID', { hour12: false });
  $('tanggal-digital').textContent = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function setPesan(id, pesan, tipe = 'info') {
  const el = $(id); el.textContent = pesan; el.className = `notice ${tipe}`;
}

function tampilkanIdentitas() {
  $('nama-pegawai').textContent = pegawaiAktif.nama;
  $('jabatan-pegawai').textContent = `${pegawaiAktif.jabatan} • ${pegawaiAktif.id}`;
}

function bukaTab(tipe) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active', 'pulang'));
  document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
  $(tipe === 'masuk' ? 'btn-tab-masuk' : 'btn-tab-pulang').classList.add('active');
  if (tipe === 'pulang') $('btn-tab-pulang').classList.add('pulang');
  $(`content-${tipe}`).classList.add('active');
}

function ubahStatusKehadiran() {
  const status = $('status-kehadiran').value;
  const hadirDiKantor = status === 'hadir';
  $('area-izin').hidden = hadirDiKantor || !status;
  $('area-kamera-masuk').hidden = !hadirDiKantor;
  $('area-lokasi').hidden = !hadirDiKantor;
  $('alasan-izin').required = !hadirDiKantor && !!status;
  $('btn-absen-masuk').textContent = status === 'hadir' ? 'Kirim Absen Masuk' : 'Kirim Izin';
  $('btn-absen-masuk').disabled = !status;
}

function bukaKamera(target) {
  const input = $(target === 'masuk' ? 'kamera-masuk' : 'kamera-pulang');
  input.click();
}


async function prosesFoto(event, target) {
  try {
    const dataUrl = await kompresFoto(event.target.files[0]);
    if (target === 'masuk') fotoMasuk = dataUrl; else fotoPulang = dataUrl;
    $(`preview-${target}`).src = dataUrl;
    $(`preview-${target}`).hidden = false;
    setPesan(`pesan-foto-${target}`, 'Foto berhasil dipilih dan dikompres.', 'success');
  } catch (error) { setPesan(`pesan-foto-${target}`, error.message, 'error'); }
}

async function ambilLokasi() {
  try {
    const lokasi = await ambilLokasiBrowser();
    posisiTerakhir = lokasi;
    setPesan('pesan-lokasi', `Lokasi sesuai. Jarak ke kantor sekitar ${Math.round(lokasi.jarak)} meter (akurasi GPS ±${Math.round(lokasi.accuracy)} m).`, 'success');
    return lokasi;
  } catch (error) {
    setPesan('pesan-lokasi', error.message, 'error');
    throw error;
  }
}


function kompresFoto(file, maxWidth = 720, quality = 0.62) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Pilih file foto yang valid.'));
    const reader = new FileReader(); reader.onerror = () => reject(new Error('Foto gagal dibaca.'));
    reader.onload = () => { const img = new Image(); img.onerror = () => reject(new Error('Foto tidak dapat dibuka.')); img.onload = () => { const scale = Math.min(1, maxWidth / img.width); const canvas = document.createElement('canvas'); canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale); canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', quality)); }; img.src = reader.result; };
    reader.readAsDataURL(file);
  });
}
function hitungJarak(lat1, lon1, lat2, lon2) { const R=6371000, rad=v=>v*Math.PI/180, dLat=rad(lat2-lat1), dLon=rad(lon2-lon1), a=Math.sin(dLat/2)**2+Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2; return 2*R*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }
function ambilLokasiBrowser() { return new Promise((resolve,reject)=>{ if(!navigator.geolocation)return reject(new Error('Browser tidak mendukung Geolocation.')); navigator.geolocation.getCurrentPosition(pos=>{const {latitude,longitude,accuracy}=pos.coords;const jarak=hitungJarak(latitude,longitude,KANTOR.lat,KANTOR.lon);if(jarak>RADIUS_KANTOR)return reject(new Error(`Di luar radius kantor. Jarak terukur ${Math.round(jarak)} meter (maksimal 500 meter).`));resolve({latitude,longitude,accuracy,jarak});},err=>reject(new Error(err.code===1?'Izin lokasi ditolak. Aktifkan akses lokasi pada browser.':'Lokasi tidak berhasil diperoleh. Coba lagi di area terbuka.'),{enableHighAccuracy:true,timeout:15000,maximumAge:0})); }

function statusTerlambat(jam) { return jam > BATAS_TERLAMBAT ? 'terlambat' : 'hadir'; }

async function kirimAbsenMasuk() {
  const status = $('status-kehadiran').value;
  if (!status) return setPesan('pesan-masuk', 'Pilih status kehadiran terlebih dahulu.', 'error');
  const data = bacaAbsensi();
  if (data.some((x) => x.pegawaiId === pegawaiAktif.id && x.tanggal === tanggalHariIni()))
    return setPesan('pesan-masuk', 'Anda sudah mengisi absensi hari ini.', 'error');

  let lokasi = null, foto = '';
  if (status === 'hadir') {
    if (!fotoMasuk) return setPesan('pesan-masuk', 'Foto selfie wajib dilampirkan sebelum absen.', 'error');
    try { lokasi = await ambilLokasi(); } catch (e) { return setPesan('pesan-masuk', e.message, 'error'); }
    foto = fotoMasuk;
  } else if (!$('alasan-izin').value.trim()) {
    return setPesan('pesan-masuk', 'Alasan izin/sakit/cuti wajib diisi.', 'error');
  }

  const jam = waktuSekarang();
  const record = {
    id: `ABS-${Date.now()}`, pegawaiId: pegawaiAktif.id, nama: pegawaiAktif.nama,
    jabatan: pegawaiAktif.jabatan, tanggal: tanggalHariIni(), status,
    statusWaktu: status === 'hadir' ? statusTerlambat(jam) : status,
    jamMasuk: status === 'hadir' ? jam : null,
    alasan: status === 'hadir' ? '' : $('alasan-izin').value.trim(),
    fotoMasuk: foto, lokasiMasuk: lokasi, jamPulang: null, fotoPulang: '', kegiatan: ''
  };
  try { data.push(record); simpanAbsensi(data); }
  catch { return setPesan('pesan-masuk', 'Penyimpanan penuh. Kurangi ukuran foto atau hapus data uji lama.', 'error'); }
  setPesan('pesan-masuk', status === 'hadir' ? `Absen masuk berhasil pukul ${jam}. Status: ${record.statusWaktu}.` : `Pengajuan ${status} berhasil dicatat.`, 'success');
  perbaruiStatusHariIni();
}

async function kirimAbsenPulang() {
  const kegiatan = $('kegiatan-pulang').value.trim();
  if (kegiatan.length < 5) return setPesan('pesan-pulang', 'Isi kegiatan hari ini minimal 5 karakter.', 'error');
  if (!fotoPulang) return setPesan('pesan-pulang', 'Foto selfie wajib dilampirkan sebelum absen pulang.', 'error');
  const data = bacaAbsensi();
  const record = data.find((x) => x.pegawaiId === pegawaiAktif.id && x.tanggal === tanggalHariIni());
  if (!record) return setPesan('pesan-pulang', 'Anda belum melakukan absen masuk hari ini.', 'error');
  if (record.status !== 'hadir') return setPesan('pesan-pulang', 'Absen pulang tidak berlaku untuk status izin/sakit/cuti.', 'error');
  if (record.jamPulang) return setPesan('pesan-pulang', 'Absen pulang sudah tercatat hari ini.', 'error');
  let lokasi;
  try { lokasi = await ambilLokasi(); } catch (e) { return setPesan('pesan-pulang', e.message, 'error'); }
  record.jamPulang = waktuSekarang(); record.kegiatan = kegiatan; record.fotoPulang = fotoPulang; record.lokasiPulang = lokasi;
  try { simpanAbsensi(data); } catch { return setPesan('pesan-pulang', 'Penyimpanan penuh. Foto terlalu besar.', 'error'); }
  setPesan('pesan-pulang', `Absen pulang berhasil pukul ${record.jamPulang}.`, 'success');
  perbaruiStatusHariIni();
}

function perbaruiStatusHariIni() {
  const record = bacaAbsensi().find((x) => x.pegawaiId === pegawaiAktif.id && x.tanggal === tanggalHariIni());
  $('status-hari-ini').textContent = !record ? 'Belum melakukan absensi' : record.status === 'hadir' ? `Masuk ${record.jamMasuk}${record.jamPulang ? ` • Pulang ${record.jamPulang}` : ' • Belum absen pulang'}` : `Tercatat ${record.status}`;
  $('btn-tab-pulang').disabled = !record || record.status !== 'hadir' || !!record.jamPulang;
  $('btn-absen-pulang').disabled = !record || record.status !== 'hadir' || !!record.jamPulang || $('kegiatan-pulang').value.trim().length < 5;
  if (!record || record.status !== 'hadir') $('hint-pulang').textContent = 'Absen masuk hadir harus tercatat terlebih dahulu.';
  else if (record.jamPulang) $('hint-pulang').textContent = 'Absensi hari ini sudah selesai.';
  else $('hint-pulang').textContent = 'Isi kegiatan dan lampirkan foto untuk mengaktifkan absen pulang.';
}

function init() {
  muatPegawai().then((list) => {
    const saved = localStorage.getItem(SESSION_KEY);
    pegawaiAktif = list.find((p) => p.id === saved) || list[0];
    if (!saved) localStorage.setItem(SESSION_KEY, pegawaiAktif.id);
    tampilkanIdentitas(); perbaruiStatusHariIni();
  }).catch((e) => setPesan('pesan-masuk', e.message, 'error'));
  updateJam(); setInterval(updateJam, 1000);
  $('status-kehadiran').addEventListener('change', ubahStatusKehadiran);
  $('kamera-masuk').addEventListener('change', (e) => prosesFoto(e, 'masuk'));
  $('kamera-pulang').addEventListener('change', (e) => prosesFoto(e, 'pulang'));
  $('btn-absen-masuk').addEventListener('click', kirimAbsenMasuk);
  $('btn-absen-pulang').addEventListener('click', kirimAbsenPulang);
  $('kegiatan-pulang').addEventListener('input', perbaruiStatusHariIni);
  $('btn-tab-masuk').addEventListener('click', () => bukaTab('masuk'));
  $('btn-tab-pulang').addEventListener('click', () => bukaTab('pulang'));
  $('btn-kamera-masuk').addEventListener('click', () => bukaKamera('masuk'));
  $('btn-kamera-pulang').addEventListener('click', () => bukaKamera('pulang'));
  $('btn-keluar').addEventListener('click', () => { localStorage.removeItem(SESSION_KEY); location.href = 'index.html'; });
}

document.addEventListener('DOMContentLoaded', init);
