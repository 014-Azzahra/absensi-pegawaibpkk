const { ZONA_WAKTU } = require('../config');

/** Tanggal & jam saat ini menurut zona waktu kantor (bukan zona waktu server). */
function sekarang(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_WAKTU, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(date).reduce((o, p) => (o[p.type] = p.value, o), {});
  return { tanggal: `${parts.year}-${parts.month}-${parts.day}`, jam: `${parts.hour}:${parts.minute}` };
}

const BULAN_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const TANGGAL_RE = /^\d{4}-\d{2}-\d{2}$/;
const bulanValid = (s) => typeof s === 'string' && BULAN_RE.test(s);
const tanggalValid = (s) => typeof s === 'string' && TANGGAL_RE.test(s) && !Number.isNaN(Date.parse(s));

/** Daftar tanggal hari kerja (Senin-Jumat) dalam bulan, sampai batas hari ini. */
function hariKerjaBulan(bulan) {
  const [y, m] = bulan.split('-').map(Number);
  const hariIni = sekarang().tanggal;
  const jumlahHari = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const hasil = [];
  for (let d = 1; d <= jumlahHari; d++) {
    const tgl = `${bulan}-${String(d).padStart(2, '0')}`;
    if (tgl > hariIni) break;
    const hari = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (hari !== 0 && hari !== 6) hasil.push(tgl);
  }
  return hasil;
}

module.exports = { sekarang, bulanValid, tanggalValid, hariKerjaBulan };
