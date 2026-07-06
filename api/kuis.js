export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ pesan: 'Method not allowed' });

  try {
    const payload = JSON.parse(req.body);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    // 1. Ambil data kunci dengan penangkap error presisi
    const modResponse = await fetch(`${url}/rest/v1/Modules?id=eq.${payload.modulId}&select=*`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
    });

    if (!modResponse.ok) {
      const errData = await modResponse.json();
      throw new Error("Supabase menolak ID modul: " + JSON.stringify(errData));
    }

    const modules = await modResponse.json();
    
    // Cek absolut: pastikan balasan adalah array dan tidak kosong
    if (!Array.isArray(modules) || modules.length === 0) {
      return res.status(404).json({ status: false, pesan: "Data modul tidak ditemukan di database." });
    }
    
    const activeModul = modules[0];

    // Cek absolut: pastikan kolom kunci1 dan kunci2 benar-benar ada di tabel Supabase
    if (activeModul.kunci1 === undefined || activeModul.kunci2 === undefined) {
      throw new Error("Kolom 'kunci1' atau 'kunci2' tidak ditemukan. Cek ejaan huruf di tabel Modules Supabase Anda.");
    }

    // (Di bawah baris const activeModul = modules[0];)
    let skor = 0;
    
    // Tarik 5 jawaban dari payload (pastikan HTML mengirim 5 jawaban)
    if ((payload.jawaban1 || "").toString().trim() === (activeModul.kunci1 || "").toString().trim()) skor += 20;
    if ((payload.jawaban2 || "").toString().trim() === (activeModul.kunci2 || "").toString().trim()) skor += 20;
    if ((payload.jawaban3 || "").toString().trim() === (activeModul.kunci3 || "").toString().trim()) skor += 20;
    if ((payload.jawaban4 || "").toString().trim() === (activeModul.kunci4 || "").toString().trim()) skor += 20;
    if ((payload.jawaban5 || "").toString().trim() === (activeModul.kunci5 || "").toString().trim()) skor += 20;

    const statusLulus = (skor === 100) ? "LULUS" : "GAGAL";

    const payloadLog = {
      nama: payload.nama,
      pin: payload.pin,
      modul_id: "Modul " + activeModul.id,
      skor: skor,
      status: statusLulus
    };

    // 2. Suntik data log hasil ujian ke Supabase dengan penangkap error
    const logResponse = await fetch(`${url}/rest/v1/Progress`, {
      method: 'POST',
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payloadLog)
    });

    if (!logResponse.ok) {
      const logErr = await logResponse.json();
      throw new Error("Gagal mengunci catatan kompetensi: " + JSON.stringify(logErr));
    }

    return res.status(200).json({ status: true, skor });
  } catch (err) {
    // Memuntahkan laporan kegagalan ke layar HP agar mudah dianalisis
    return res.status(500).json({ status: false, pesan: err.message });
  }
}
