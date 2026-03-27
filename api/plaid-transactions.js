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

    const useStart = start_date || defaultStart.toISOString().split('T')[0];
    const useEnd = end_date || now.toISOString().split('T')[0];

    // Use transactions/get for date-range queries (more reliable than sync for historical data)
    const fetchPage = async (offset = 0, accumulated = []) => {
      const response = await fetch(`${baseUrl}/transactions/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          secret: SECRET,
          access_token,
          start_date: useStart,
          end_date: useEnd,
          options: { count: 500, offset },
        }),
      });
      const data = await response.json();
      if (data.error_code || !response.ok) {
        // If transactions/get fails, try sync as fallback
        if (offset === 0) {
          const syncResp = await fetch(`${baseUrl}/transactions/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: CLIENT_ID, secret: SECRET, access_token }),
          });
          return res.status(syncResp.status).json(await syncResp.json());
        }
        return res.status(response.status).json(data);
      }
      const all = [...accumulated, ...(data.transactions || [])];
      // If there are more transactions, paginate (up to 5 pages / 2500 transactions)
      if (all.length < data.total_transactions && offset + 500 < data.total_transactions && offset < 2000) {
        return fetchPage(offset + 500, all);
      }
      return res.status(200).json({ transactions: all, total_transactions: data.total_transactions, start_date: useStart, end_date: useEnd });
    };

    return fetchPage();
  } catch (error) {
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
