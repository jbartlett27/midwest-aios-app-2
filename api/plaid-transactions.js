export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLIENT_ID = process.env.PLAID_CLIENT_ID;
  const SECRET = process.env.PLAID_SECRET;
  const PLAID_ENV = process.env.PLAID_ENV || 'sandbox';

  if (!CLIENT_ID || !SECRET) {
    return res.status(500).json({ error: 'PLAID_CLIENT_ID or PLAID_SECRET not set' });
  }

  const baseUrl = PLAID_ENV === 'production'
    ? 'https://production.plaid.com'
    : PLAID_ENV === 'development'
    ? 'https://development.plaid.com'
    : 'https://sandbox.plaid.com';

  try {
    const { access_token, start_date, end_date } = req.body;
    if (!access_token) return res.status(400).json({ error: 'access_token required' });

    // Default to last 90 days if no dates given
    const now = new Date();
    const defaultStart = new Date(now);
    defaultStart.setDate(defaultStart.getDate() - 90);

    const response = await fetch(`${baseUrl}/transactions/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: CLIENT_ID,
        secret: SECRET,
        access_token,
      }),
    });
    const data = await response.json();

    // If sync isn't available, fall back to transactions/get
    if (data.error_code === 'PRODUCT_NOT_READY' || !response.ok) {
      const fallback = await fetch(`${baseUrl}/transactions/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          secret: SECRET,
          access_token,
          start_date: start_date || defaultStart.toISOString().split('T')[0],
          end_date: end_date || now.toISOString().split('T')[0],
          options: { count: 500, offset: 0 },
        }),
      });
      const fbData = await fallback.json();
      return res.status(fallback.status).json(fbData);
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
