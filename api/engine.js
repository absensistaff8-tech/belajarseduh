export default async function handler(req, res) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const headers = { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" };

  // GET: Tarik data untuk Dropdown Pilihan
  if (req.method === 'GET') {
    try {
      const [menuRes, bahanRes] = await Promise.all([
        fetch(`${url}/rest/v1/Menu?select=id,nama_menu`, { headers }),
        fetch(`${url}/rest/v1/Bahan_Baku?select=id,nama_bahan,satuan_terkecil`, { headers })
      ]);
      return res.status(200).json({ 
        status: true, 
        menu: await menuRes.json(), 
        bahan: await bahanRes.json() 
      });
    } catch (err) { return res.status(500).json({ status: false, pesan: err.message }); }
  }

  // POST: Simpan Data Baru (Menu / Bahan / Resep)
  if (req.method === 'POST') {
    try {
      const { aksi, payload } = req.body;
      let targetTable = "";
      
      if (aksi === "ADD_BAHAN") targetTable = "Bahan_Baku";
      if (aksi === "ADD_MENU") targetTable = "Menu";
      if (aksi === "ADD_RESEP") targetTable = "Resep_Detail";

      if (!targetTable) throw new Error("Aksi tidak dikenali sistem.");

      const insertRes = await fetch(`${url}/rest/v1/${targetTable}`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(payload)
      });

      if (!insertRes.ok) throw new Error(`Gagal menyimpan ke ${targetTable}`);
      return res.status(200).json({ status: true, pesan: "Data terkunci di server." });
    } catch (err) {
      return res.status(500).json({ status: false, pesan: err.message });
    }
  }
  
  return res.status(405).json({ pesan: 'Method not allowed' });
}
