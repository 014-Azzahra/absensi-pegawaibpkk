/* Utilitas kamera: kompresi gambar sebelum disimpan di localStorage. */
window.PresensiKamera = {
  kompresFoto(file, maxWidth = 720, quality = 0.62) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) return reject(new Error('Pilih file foto yang valid.'));
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Foto gagal dibaca.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Format foto tidak dapat dibuka.'));
        img.onload = () => {
          const scale = Math.min(1, maxWidth / img.width);
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }
};