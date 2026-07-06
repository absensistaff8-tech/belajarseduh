export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ pesan: 'Method not allowed' });
  
  try {
    const { pin } = JSON.parse(req.body);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(`${url}/rest/v1/Data_Staf?pin=eq.${pin}&select=*`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
    });
    const data = await response.json();

    if (data && data.length > 0) {
      const staf = data[0];
      if (staf.status.toUpperCase() !== "AKTIF") {
        return res.status(200).json({ status: false, pesan: "AKSES DITOLAK: Status Anda NON-AKTIF." });
      }
      return res.status(200).json({ status: true, nama: staf.nama, peran: staf.peran });
    }
    return res.status(200).json({ status: false, pesan: "PIN SALAH: Otorisasi ditolak." });
  } catch (err) {
    return res.status(500).json({ status: false, pesan: "Server Error: " + err.message });
  }
}
