export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ pesan: 'Method not allowed' });

  try {
    const { peran, pin } = JSON.parse(req.body);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    // 1. Tarik seluruh modul sesuai peran, diurutkan secara hierarki (ID Ascending)
    const modResponse = await fetch(`${url}/rest/v1/Modules?target_peran=in.(${peran},ALL)&select=*&order=id.asc`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
    });
    if (!modResponse.ok) throw new Error("Gagal menarik data modul dari pangkalan data.");
    const dataModul = await modResponse.json();

    // 2. Tarik riwayat kelulusan khusus untuk PIN staf yang sedang login
    const progResponse = await fetch(`${url}/rest/v1/Progress?pin=eq.${pin}&status=eq.LULUS&select=modul_id`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
    });
    if (!progResponse.ok) throw new Error("Gagal menarik riwayat progres staf.");
    const dataProgress = await progResponse.json();

    // 3. Ekstrak hanya ID modul yang sudah berstatus LULUS (Hapus kata "Modul ")
    const passedIds = dataProgress.map(p => p.modul_id.replace("Modul ", "").trim());

    // Kirim data modul beserta daftar ID yang sudah lulus ke frontend
    return res.status(200).json({ status: true, data: dataModul, passed: passedIds });
  } catch (err) {
    return res.status(500).json({ status: false, pesan: err.message });
  }
}
