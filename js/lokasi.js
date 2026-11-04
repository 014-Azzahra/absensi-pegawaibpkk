/* Geolocation API + rumus Haversine untuk validasi radius kantor. */
window.PresensiLokasi = {
  hitungJarak(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const rad = (nilai) => nilai * Math.PI / 180;
    const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  },
  ambil(kantor, radiusMaksimum) {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error('Browser tidak mendukung Geolocation.'));
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        const jarak = this.hitungJarak(latitude, longitude, kantor.lat, kantor.lon);
        if (jarak > radiusMaksimum) return reject(new Error(`Di luar radius kantor. Jarak terukur ${Math.round(jarak)} meter; batas maksimal ${radiusMaksimum} meter.`));
        resolve({ latitude, longitude, accuracy, jarak });
      }, (err) => reject(new Error(err.code === 1 ? 'Izin lokasi ditolak. Aktifkan akses lokasi pada browser.' : 'Lokasi tidak berhasil diperoleh. Coba lagi di area terbuka.')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
    });
  }
};
