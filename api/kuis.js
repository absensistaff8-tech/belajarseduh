export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ pesan: 'Method not allowed' });

  try {
    const payload = JSON.parse(req.body);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_KEY;

    // 1. Ambil data kunci dari database secara internal di server
    const modResponse = await fetch(`${url}/rest/v1/Modules?id=eq.${payload.modulId}&select=*`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
    });
    const modules = await modResponse.json();
    if (!modules || modules.length === 0) return res.status(404).json({ status: false, pesan: "Modul tidak ditemukan." });
    
    const activeModul = modules[0];
    let skor = 0;
    if (payload.jawaban1.trim() == activeModul.kunci1.trim()) skor += 50;
    if (payload.jawaban2.trim() == activeModul.kunci2.trim()) skor += 50;

    const statusLulus = (skor === 100) ? "LULUS" : "GAGAL";

    const payloadLog = {
      nama: payload.nama,
      pin: payload.pin,
      modul_id: "Modul " + activeModul.id,
      skor: skor,
      status: statusLulus
    };

    // 2. Suntik data log hasil ujian ke Supabase
    const logResponse = await fetch(`${url}/rest/v1/Progress`, {
      method: 'POST',
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payloadLog)
    });

    if (!logResponse.ok) throw new Error("Gagal mengunci catatan kompetensi ke database.");

    return res.status(200).json({ status: true, skor });
  } catch (err) {
    return res.status(500).json({ status: false, pesan: "Server Error: " + err.message });
  }
}
