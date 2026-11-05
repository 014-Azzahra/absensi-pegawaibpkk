/**
 * Google Apps Script – penerima sinkronisasi absensi dari server Node.js.
 * Tempel di Extensions → Apps Script pada Google Sheet, lalu Deploy sebagai Web app.
 * Satu baris per (tanggal, ID pegawai); absen pulang memperbarui baris yang sama.
 */
const NAMA_SHEET = 'Absensi';
const HEADER = ['Tanggal', 'ID', 'Nama', 'Jabatan', 'Status', 'Jam Masuk', 'Jam Pulang', 'Alasan', 'Kegiatan'];

function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(NAMA_SHEET) || ss.insertSheet(NAMA_SHEET);
  if (sh.getLastRow() === 0) sh.appendRow(HEADER);

  // Awali '  jika teks diawali = + - @ agar tidak dibaca sebagai rumus (formula injection)
  const aman = (v) => (typeof v === 'string' && /^[=+\-@]/.test(v)) ? "'" + v : v;
  const baris = [d.tanggal, d.kode, d.nama, d.jabatan, d.statusWaktu, d.jamMasuk || '', d.jamPulang || '', d.alasan || '', d.kegiatan || ''].map(aman);
  const data = sh.getDataRange().getValues();
  let idx = -1;
  for (let i = 1; i < data.length; i++) {
    const tgl = data[i][0] instanceof Date ? Utilities.formatDate(data[i][0], 'Asia/Makassar', 'yyyy-MM-dd') : String(data[i][0]);
    if (tgl === d.tanggal && data[i][1] === d.kode) { idx = i + 1; break; }
  }
  if (idx > 0) sh.getRange(idx, 1, 1, baris.length).setValues([baris]); else sh.appendRow(baris);
  return ContentService.createTextOutput('ok');
}
