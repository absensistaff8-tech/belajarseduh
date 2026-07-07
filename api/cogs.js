export default async function handler(req, res) {
  // Hanya menerima permintaan GET (mengambil data matang)
  if (req.method !== 'GET') return res.status(405).json({ pesan: 'Method not allowed' });

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    const headers = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };

    // 1. Tarik 3 Tabel Sekaligus secara Paralel (Efisiensi Waktu Render)
    const [menuRes, bahanRes, resepRes] = await Promise.all([
      fetch(`${url}/rest/v1/Menu?select=*`, { headers }),
      fetch(`${url}/rest/v1/Bahan_Baku?select=*`, { headers }),
      fetch(`${url}/rest/v1/Resep_Detail?select=*`, { headers })
    ]);

    if (!menuRes.ok || !bahanRes.ok || !resepRes.ok) {
      throw new Error("Gagal menarik matriks data dari Supabase.");
    }

    const dataMenu = await menuRes.json();
    const dataBahan = await bahanRes.json();
    const dataResep = await resepRes.json();

    // 2. Pemetaan Harga Bahan Baku per Satuan Terkecil (Mesin Konversi)
    const petaBahan = {};
    dataBahan.forEach(bahan => {
      // Rumus HPP Absolut = Harga Kemasan / Total Isi
      const hargaPerSatuan = bahan.harga_beli_kemasan / bahan.isi_per_kemasan;
      petaBahan[bahan.id] = {
        nama: bahan.nama_bahan,
        satuan: bahan.satuan_terkecil,
        hargaSatuan: hargaPerSatuan
      };
    });

    // 3. Kalkulasi Matriks COGS per Menu
    const laporanCogs = dataMenu.map(menu => {
      const resepMenu = dataResep.filter(r => r.menu_id === menu.id);
      let totalHpp = 0;
      
      const rincianBahan = resepMenu.map(r => {
        const bahan = petaBahan[r.bahan_id];
        if (!bahan) return null; // Toleransi jika bahan baku dihapus dari gudang
        
        const biayaBahan = bahan.hargaSatuan * r.takaran;
        totalHpp += biayaBahan;
        
        return {
          nama_bahan: bahan.nama,
          takaran: r.takaran,
          satuan: bahan.satuan,
          biaya: Math.round(biayaBahan) // Pembulatan nilai Rupiah
        };
      }).filter(b => b !== null);

      // Kalkulasi Persentase Margin
      const cogsPersen = menu.harga_jual > 0 ? (totalHpp / menu.harga_jual) * 100 : 0;
      const isSehat = cogsPersen <= menu.target_cogs_maks;

      return {
        id_menu: menu.id,
        nama_menu: menu.nama_menu,
        harga_jual: menu.harga_jual,
        target_maks: menu.target_cogs_maks,
        total_hpp: Math.round(totalHpp),
        cogs_aktual_persen: parseFloat(cogsPersen.toFixed(2)),
        status: isSehat ? "SEHAT" : "BOCOR",
        rincian_resep: rincianBahan
      };
    });

    // Kirim laporan matang ke antarmuka
    return res.status(200).json({ status: true, data: laporanCogs });
  } catch (err) {
    return res.status(500).json({ status: false, pesan: err.message });
  }
}
