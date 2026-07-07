export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ pesan: 'Method not allowed' });

  try {
    const payload = JSON.parse(req.body);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    // 1. Tarik kunci dari database
    const modResponse = await fetch(`${url}/rest/v1/Modules?id=eq.${payload.modulId}&select=*`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
    });

    if (!modResponse.ok) throw new Error("Gagal membaca database.");
    const modules = await modResponse.json();
    
    if (!Array.isArray(modules) || modules.length === 0) {
      return res.status(404).json({ status: false, pesan: "Data modul tidak ditemukan." });
    }
    
    const activeModul = modules[0];
    
    // 2. FUNGSI PEMBERSIH KAKU (Huruf kecil semua & pangkas spasi)
    const bersihkan = (teks) => (teks || "").toString().toLowerCase().trim();

    // 3. Ekstrak dan bersihkan kunci dari Supabase
    const k1 = bersihkan(activeModul.kunci1);
    const k2 = bersihkan(activeModul.kunci2);
    const k3 = bersihkan(activeModul.kunci3);
    const k4 = bersihkan(activeModul.kunci4);
    const k5 = bersihkan(activeModul.kunci5);

    // 4. Ekstrak dan bersihkan jawaban dari HP Staf
    const j1 = bersihkan(payload.jawaban1);
    const j2 = bersihkan(payload.jawaban2);
    const j3 = bersihkan(payload.jawaban3);
    const j4 = bersihkan(payload.jawaban4);
    const j5 = bersihkan(payload.jawaban5);

    // 5. Kalkulasi Dinamis (Hanya hitung soal yang kuncinya diisi di Supabase)
    let skor = 0;
    let totalSoalAktif = 0;
    
    if (k1 !== "") { totalSoalAktif++; if (j1 === k1) skor += 1; }
    if (k2 !== "") { totalSoalAktif++; if (j2 === k2) skor += 1; }
    if (k3 !== "") { totalSoalAktif++; if (j3 === k3) skor += 1; }
    if (k4 !== "") { totalSoalAktif++; if (j4 === k4) skor += 1; }
    if (k5 !== "") { totalSoalAktif++; if (j5 === k5) skor += 1; }

    // 6. Konversi ke standar nilai 100
    let skorAkhir = 0;
    if (totalSoalAktif > 0) {
      skorAkhir = Math.round((skor / totalSoalAktif) * 100);
    }

    const statusLulus = (skorAkhir === 100) ? "LULUS" : "GAGAL";

    const payloadLog = {
      nama: payload.nama,
      pin: payload.pin,
      modul_id: "Modul " + activeModul.id,
      skor: skorAkhir,
      status: statusLulus
    };

    // 7. Suntik rekam jejak ke tabel Progress
    const logResponse = await fetch(`${url}/rest/v1/Progress`, {
      method: 'POST',
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify(payloadLog)
    });

    if (!logResponse.ok) throw new Error("Gagal mengunci catatan kompetensi ke database.");

    return res.status(200).json({ status: true, skor: skorAkhir });
  } catch (err) {
    return res.status(500).json({ status: false, pesan: err.message });
  }
}
