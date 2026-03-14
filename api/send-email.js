// ═══════════════════════════════════════════════════════════════
// EMAIL API — Vercel Serverless Function
// Sends document emails via Resend (free: 100 emails/day)
// Setup: Add RESEND_API_KEY to Vercel Environment Variables
// Get key from: https://resend.com/api-keys
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'RESEND_API_KEY not configured. Add it in Vercel > Settings > Environment Variables.' });
  }

  try {
    const { to, subject, html, from } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing to, subject, or html' });
    }

    // Resend requires from to be either onboarding@resend.dev or a verified domain
    // If user provides a custom from, use it as the reply-to and send from resend.dev
    const userFrom = from || '';
    const hasVerifiedDomain = process.env.RESEND_VERIFIED_DOMAIN;
    const senderEmail = hasVerifiedDomain 
      ? `Midwest Furnishings <${userFrom || 'noreply@' + hasVerifiedDomain}>`
      : 'Midwest Furnishings <onboarding@resend.dev>';

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: senderEmail,
        reply_to: userFrom || undefined,
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = await emailRes.json();

    if (emailRes.ok) {
      return res.status(200).json({ success: true, id: data.id });
    } else {
      return res.status(emailRes.status).json({ error: data.message || 'Email send failed' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
