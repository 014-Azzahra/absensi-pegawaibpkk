/* Klien API bersama (dipakai halaman login, pegawai, dan admin).
   Semua komunikasi ke backend memakai fetch + token JWT di header Authorization. */
(function () {
  // Jika halaman dibuka dari server Express (port 3000) pakai alamat relatif.
  // Jika dibuka lewat Live Server / port lain, arahkan ke backend di localhost:3000.
  const BASE = location.port === '3000' || location.protocol === 'https:' ? '' : 'http://localhost:3000';
  const KEY_TOKEN = 'bpkk_token', KEY_USER = 'bpkk_user';

  const Api = {
    base: BASE,
    token: () => localStorage.getItem(KEY_TOKEN),
    user: () => { try { return JSON.parse(localStorage.getItem(KEY_USER)); } catch { return null; } },
    simpanSesi(token, user) { localStorage.setItem(KEY_TOKEN, token); localStorage.setItem(KEY_USER, JSON.stringify(user)); },
    hapusSesi() { localStorage.removeItem(KEY_TOKEN); localStorage.removeItem(KEY_USER); },

    /** Pastikan sudah login dengan peran tertentu; jika tidak, arahkan ke halaman login. */
    wajibPeran(peran) {
      const u = Api.user();
      if (!Api.token() || !u || u.role !== peran) {
        Api.hapusSesi();
        location.replace(peran === 'admin' ? 'loginadmin.html' : 'index.html');
        return null;
      }
      return u;
    },
    keluar(peran) { Api.hapusSesi(); location.href = peran === 'admin' ? 'loginadmin.html' : 'index.html'; },

    async request(method, url, { json, form, raw } = {}) {
      const headers = {};
      if (Api.token()) headers.Authorization = `Bearer ${Api.token()}`;
      let body;
      if (json !== undefined) { headers['Content-Type'] = 'application/json'; body = JSON.stringify(json); }
      else if (form) body = form;
      let res;
      try { res = await fetch(BASE + url, { method, headers, body }); }
      catch { throw new Error('Tidak dapat terhubung ke server. Pastikan backend sudah berjalan (npm start di folder server).'); }
      if (res.status === 401 && !url.startsWith('/api/auth/login')) {
        const peran = (Api.user() || {}).role; Api.hapusSesi();
        alert('Sesi berakhir. Silakan login kembali.');
        location.href = peran === 'admin' ? 'loginadmin.html' : 'index.html';
        throw new Error('Sesi berakhir.');
      }
      if (raw) { if (!res.ok) throw new Error((await res.json().catch(() => ({}))).pesan || 'Permintaan gagal.'); return res; }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.pesan || 'Permintaan gagal.');
      return data;
    },
    get: (url) => Api.request('GET', url),
    post: (url, json) => Api.request('POST', url, { json }),
    put: (url, json) => Api.request('PUT', url, { json }),
    del: (url) => Api.request('DELETE', url),
    kirimForm: (url, form) => Api.request('POST', url, { form }),

    /** Ambil foto (butuh token) dan kembalikan object URL untuk <img>. */
    async urlFoto(nama) {
      const res = await Api.request('GET', `/api/foto/${encodeURIComponent(nama)}`, { raw: true });
      return URL.createObjectURL(await res.blob());
    },
    /** Unduh file hasil ekspor (CSV/Excel) dengan token. */
    async unduh(url, namaFile) {
      const res = await Api.request('GET', url, { raw: true });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(await res.blob()); a.download = namaFile;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    },
    /** dataURL (hasil canvas.toDataURL) -> Blob untuk diunggah via multipart. */
    async dataUrlKeBlob(dataUrl) { return (await fetch(dataUrl)).blob(); },
  };
  window.Api = Api;
})();
