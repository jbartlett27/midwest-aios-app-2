export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const CLIENT_ID = process.env.PLAID_CLIENT_ID;
  const SECRET = process.env.PLAID_SECRET;
  // Default to production since Maureen has production keys
  const PLAID_ENV = process.env.PLAID_ENV || 'production';

  if (!CLIENT_ID || !SECRET) {
    return res.status(500).json({ error: 'PLAID_CLIENT_ID or PLAID_SECRET not set in Vercel environment variables' });
  }

  const baseUrl = PLAID_ENV === 'production'
    ? 'https://production.plaid.com'
    : PLAID_ENV === 'development'
    ? 'https://development.plaid.com'
    : 'https://sandbox.plaid.com';

  try {
    const { action } = req.body;

    // Step 1: Create a link token (opens the Plaid Link popup)
    if (action === 'create_link_token') {
      // Update mode: when an access_token is supplied, Plaid opens Link in
      // "update mode" against the EXISTING item so the user can re-enter their
      // login (e.g., after a bank-forced password reset -- ITEM_LOGIN_REQUIRED).
      // The same item and access_token stay valid, transaction history is
      // preserved, and no duplicate accounts are created. In update mode Plaid
      // requires that `products` be omitted and `access_token` be provided.
      const { access_token } = req.body;

      const body = {
        client_id: CLIENT_ID,
        secret: SECRET,
        user: { client_user_id: 'midwest-user-1' },
        client_name: 'Midwest Educational Furnishings',
        country_codes: ['US'],
        language: 'en',
        // Request the maximum transaction history Plaid allows (730 days). Without
        // this, Plaid defaults to 90 days at link time and will NEVER return older
        // transactions for the item, no matter what date range a sync asks for --
        // which is why history stopped in Jan 2026. Sending this in UPDATE MODE
        // (access_token present) tells Plaid to backfill the extended history for
        // the existing item; the user just completes the Update Login popup.
        transactions: { days_requested: 730 },
      };

      if (access_token) {
        body.access_token = access_token; // update mode -- do NOT include products
      } else {
        body.products = ['transactions']; // normal first-time link
      }

      const response = await fetch(`${baseUrl}/link/token/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // Step 2: Exchange public token for access token (after user connects bank)
    if (action === 'exchange_token') {
      const { public_token } = req.body;
      if (!public_token) return res.status(400).json({ error: 'public_token required' });

      const response = await fetch(`${baseUrl}/item/public_token/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: CLIENT_ID,
          secret: SECRET,
          public_token,
        }),
      });
      const data = await response.json();
      // data.access_token is what we need to save for future transaction pulls
      return res.status(response.status).json(data);
    }

    return res.status(400).json({ error: 'Invalid action. Use create_link_token or exchange_token' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
