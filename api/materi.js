export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ pesan: 'Method not allowed' });

  try {
    const { peran } = JSON.parse(req.body);
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_KEY;

    const response = await fetch(`${url}/rest/v1/Modules?target_peran=in.(${peran},ALL)&select=*`, {
      headers: { "apikey": key, "Authorization": `Bearer ${key}`, "Content-Type": "application/json" }
    });
    const data = await response.json();
    return res.status(200).json({ status: true, data });
  } catch (err) {
    return res.status(500).json({ status: false, pesan: err.message });
  }
}
