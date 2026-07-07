export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ pesan: 'Method not allowed' });

  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;
    const headers = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };

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

    // 2. Pemetaan Bahan (Paksa ID menjadi String)
    const petaBahan = {};
    dataBahan.forEach(bahan => {
      const hargaPerSatuan = bahan.harga_beli_kemasan / bahan.isi_per_kemasan;
      // Gunakan String() agar kebal terhadap perbedaan Numeric/Text
      petaBahan[String(bahan.id)] = {
        nama: bahan.nama_bahan,
        satuan: bahan.satuan_terkecil,
        hargaSatuan: hargaPerSatuan
      };
    });

    // 3. Kalkulasi Matriks COGS (Pencocokan Presisi)
    const laporanCogs = dataMenu.map(menu => {
      // PENAMBALAN KEBOCORAN: Paksa menu_id dan id menjadi String sebelum diadu
      const resepMenu = dataResep.filter(r => String(r.menu_id) === String(menu.id));
      let totalHpp = 0;
      
      const rincianBahan = resepMenu.map(r => {
        const bahan = petaBahan[String(r.bahan_id)];
        if (!bahan) return null; 
        
        const biayaBahan = bahan.hargaSatuan * r.takaran;
        totalHpp += biayaBahan;
        
        return {
          nama_bahan: bahan.nama,
          takaran: r.takaran,
          satuan: bahan.satuan,
          biaya: Math.round(biayaBahan)
        };
      }).filter(b => b !== null);

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

    return res.status(200).json({ status: true, data: laporanCogs });
  } catch (err) {
    return res.status(500).json({ status: false, pesan: err.message });
  }
}
