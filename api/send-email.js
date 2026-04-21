// ═══════════════════════════════════════════════════════════════
// EMAIL API — Vercel Serverless Function
// Sends document emails via Resend
// Domain: mwfurnishings.com (verified in Resend)
// Setup: RESEND_API_KEY in Vercel Environment Variables
// ═══════════════════════════════════════════════════════════════

const VERIFIED_DOMAIN = 'mwfurnishings.com';
const DEFAULT_SENDER = 'quotes@mwfurnishings.com';
const SENDER_DISPLAY_NAME = 'Midwest Educational Furnishings';

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

    // The user-provided "from" is the person sending (e.g. mwelter@mwfurnishings.com or lisa@mwfurnishings.com).
    // Resend requires the actual From: header to be on the verified domain (mwfurnishings.com).
    // Strategy:
    //   - If the user's "from" is already on the verified domain, use it directly as the sender.
    //   - Otherwise, send from the default sender on the verified domain and put their address in reply_to.
    const userFrom = (from || '').trim();
    const userFromLower = userFrom.toLowerCase();
    const isOnVerifiedDomain = userFromLower.endsWith('@' + VERIFIED_DOMAIN);

    let senderEmail;
    let replyTo;

    if (isOnVerifiedDomain) {
      // User entered their @mwfurnishings.com address -- send from it directly
      senderEmail = SENDER_DISPLAY_NAME + ' <' + userFrom + '>';
      replyTo = userFrom;
    } else if (userFrom) {
      // User entered a non-mwfurnishings address -- send from default, reply-to user
      senderEmail = SENDER_DISPLAY_NAME + ' <' + DEFAULT_SENDER + '>';
      replyTo = userFrom;
    } else {
      // No from provided -- use default sender, no reply-to
      senderEmail = SENDER_DISPLAY_NAME + ' <' + DEFAULT_SENDER + '>';
      replyTo = undefined;
    }

    const payload = {
      from: senderEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (replyTo) payload.reply_to = replyTo;

    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await emailRes.json();

    if (emailRes.ok) {
      return res.status(200).json({ success: true, id: data.id });
    } else {
      return res.status(emailRes.status).json({ error: data.message || data.error || 'Email send failed' });
    }
  } catch (err) {
    return res.status(500).json({ error: 'Server error: ' + err.message });
  }
}
