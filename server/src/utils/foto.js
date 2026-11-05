const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { UPLOAD_DIR } = require('../config');
const { bad } = require('./errors');

/** Deteksi tipe gambar dari magic bytes (jangan percaya nama/mimetype dari klien). */
function deteksiTipe(buf) {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

/** Simpan foto ke uploads/ dan kembalikan nama filenya (itu yang disimpan di DB). */
function simpanFoto(file, userId, tanggal, jenis) {
  if (!file) throw bad('Foto selfie wajib dilampirkan.');
  const ext = deteksiTipe(file.buffer);
  if (!ext) throw bad('File foto tidak valid. Gunakan JPG, PNG, atau WebP.');
  const nama = `u${userId}_${tanggal}_${jenis}_${crypto.randomBytes(6).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, nama), file.buffer);
  return nama;
}

function hapusFoto(nama) {
  if (!nama) return;
  const aman = path.basename(nama);
  fs.rm(path.join(UPLOAD_DIR, aman), { force: true }, () => {});
}

module.exports = { simpanFoto, hapusFoto };
