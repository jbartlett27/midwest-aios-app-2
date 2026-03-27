export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const SECRET = process.env.STRIPE_SECRET_KEY;
  if (!SECRET) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not set in Vercel environment variables. Go to Vercel > Settings > Environment Variables and add it.' });

  const { action, job_name, customer_name, customer_email, amount_cents, line_items, job_id, invoice_id, success_url, cancel_url, session_id } = req.body;

  const headers = {
    'Authorization': `Bearer ${SECRET}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const encode = (obj, prefix = '') => {
    const parts = [];
    for (const [key, val] of Object.entries(obj)) {
      const k = prefix ? `${prefix}[${key}]` : key;
      if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
        parts.push(encode(val, k));
      } else if (Array.isArray(val)) {
        val.forEach((v, i) => {
          if (typeof v === 'object') parts.push(encode(v, `${k}[${i}]`));
          else parts.push(`${encodeURIComponent(`${k}[${i}]`)}=${encodeURIComponent(v)}`);
        });
      } else if (val !== undefined && val !== null) {
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
      }
    }
    return parts.filter(Boolean).join('&');
  };

  try {
    // CREATE CHECKOUT SESSION -- generates a payment link for an invoice
    if (action === 'create_checkout') {
      const amt = parseInt(amount_cents) || 0;
      if (amt <= 0) return res.status(400).json({ error: 'amount_cents must be positive' });

      const params = {
        mode: 'payment',
        success_url: success_url || 'https://midwest-aios-app-2.vercel.app?payment=success&job=' + (job_id || ''),
        cancel_url: cancel_url || 'https://midwest-aios-app-2.vercel.app?payment=cancelled',
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': job_name || 'Invoice Payment',
        'line_items[0][price_data][product_data][description]': 'Midwest Educational Furnishings - ' + (customer_name || 'Invoice') + (invoice_id ? ' (Invoice ' + invoice_id + ')' : ''),
        'line_items[0][price_data][unit_amount]': amt,
        'line_items[0][quantity]': 1,
        'payment_method_types[0]': 'card',
        'payment_method_types[1]': 'us_bank_account',
        'metadata[job_id]': job_id || '',
        'metadata[invoice_id]': invoice_id || '',
        'metadata[customer_name]': customer_name || '',
        'payment_intent_data[metadata][job_id]': job_id || '',
        'payment_intent_data[metadata][invoice_id]': invoice_id || '',
      };
      if (customer_email) params.customer_email = customer_email;

      const body = Object.entries(params).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
      const r = await fetch('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers, body });
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json({ url: data.url, session_id: data.id, payment_intent: data.payment_intent });
    }

    // CHECK PAYMENT STATUS
    if (action === 'check_status') {
      if (!session_id) return res.status(400).json({ error: 'session_id required' });
      const r = await fetch(`https://api.stripe.com/v1/checkout/sessions/${session_id}`, { headers });
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json({
        status: data.payment_status,
        amount: data.amount_total,
        customer_email: data.customer_details?.email,
        customer_name: data.customer_details?.name,
        job_id: data.metadata?.job_id,
        invoice_id: data.metadata?.invoice_id,
      });
    }

    // LIST RECENT PAYMENTS
    if (action === 'list_payments') {
      const r = await fetch('https://api.stripe.com/v1/payment_intents?limit=25', { headers });
      const data = await r.json();
      if (data.error) return res.status(400).json({ error: data.error.message });
      return res.status(200).json({
        payments: (data.data || []).map(p => ({
          id: p.id,
          amount: p.amount,
          status: p.status,
          created: new Date(p.created * 1000).toISOString(),
          customer_email: p.receipt_email,
          job_id: p.metadata?.job_id,
          invoice_id: p.metadata?.invoice_id,
          description: p.description,
        })),
      });
    }

    return res.status(400).json({ error: 'Unknown action. Use: create_checkout, check_status, list_payments' });
  } catch (error) {
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
