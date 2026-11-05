const { SHEETS_WEBHOOK_URL } = require('../config');

/**
 * (Opsional) Kirim data absensi ke Google Sheets lewat Apps Script Web App.
 * Aktif hanya jika SHEETS_WEBHOOK_URL diisi di .env. Gagal kirim TIDAK menggagalkan absensi.
 */
async function sinkronKeSheets(aksi, baris) {
  if (!SHEETS_WEBHOOK_URL) return;
  try {
    const res = await fetch(SHEETS_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ aksi, ...baris }),
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) console.warn('[sheets] respons', res.status);
  } catch (e) {
    console.warn('[sheets] gagal sinkron:', e.message);
  }
}
module.exports = { sinkronKeSheets };
