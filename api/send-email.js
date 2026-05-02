// ═══════════════════════════════════════════════════════════════
// EMAIL API — Vercel Serverless Function
// Sends document emails via Resend
// Domain: mwfurnishings.com (verified in Resend)
// Setup: RESEND_API_KEY in Vercel Environment Variables
// ═══════════════════════════════════════════════════════════════

const VERIFIED_DOMAIN = 'mwfurnishings.com';
const DEFAULT_SENDER = 'quotes@mwfurnishings.com';
const SENDER_DISPLAY_NAME = 'Midwest Educational Furnishings';

// Strict email validation. Resend rejects anything that doesn't match either
// "user@host.tld" or "Name <user@host.tld>". We MUST match Resend's accepted
// formats exactly -- if we let a malformed value through, the entire send fails
// with a 422. When in doubt, drop reply_to rather than risk the whole email.
const BARE_EMAIL_RE = /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/;
const NAMED_EMAIL_RE = /^.+\s*<\s*[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\s*>$/;

function isValidEmailField(s) {
  if (!s) return false;
  const t = String(s).trim();
  if (!t) return false;
  return BARE_EMAIL_RE.test(t) || NAMED_EMAIL_RE.test(t);
}

// Extract the bare email out of either "user@host" or "Name <user@host>".
// Returns null if no valid email found.
function extractBareEmail(s) {
  if (!s) return null;
  const t = String(s).trim();
  if (BARE_EMAIL_RE.test(t)) return t;
  const m = t.match(/<\s*([A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,})\s*>/);
  if (m) return m[1];
  return null;
}

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
    //   - If the user's "from" is a valid email on the verified domain, use it directly as the sender.
    //   - Otherwise, send from the default sender on the verified domain and put their address in reply_to.
    //   - If the user's input is invalid (e.g. just "Lisa" with no @), drop reply_to entirely
    //     rather than passing garbage to Resend (which would reject the entire send with 422).
    const userFrom = (from || '').trim();
    const bareFromEmail = extractBareEmail(userFrom); // null if input has no extractable email
    const isOnVerifiedDomain = bareFromEmail && bareFromEmail.toLowerCase().endsWith('@' + VERIFIED_DOMAIN);

    let senderEmail;
    let replyTo;

    if (isOnVerifiedDomain) {
      // User entered their @mwfurnishings.com address -- send from it directly.
      // This works for ANY @mwfurnishings.com address (maureen, lisa, joe, etc.),
      // not just Maureen, because Resend verifies the entire domain not individual addresses.
      senderEmail = SENDER_DISPLAY_NAME + ' <' + bareFromEmail + '>';
      replyTo = bareFromEmail;
    } else if (bareFromEmail) {
      // User entered a valid non-mwfurnishings address -- send from default, reply-to user.
      senderEmail = SENDER_DISPLAY_NAME + ' <' + DEFAULT_SENDER + '>';
      replyTo = bareFromEmail;
    } else {
      // No usable email in the from field (empty, or just a name like "Lisa").
      // Send from default sender with NO reply_to. Better to send the email
      // successfully without reply_to than to fail the whole send because of a
      // malformed reply_to value.
      senderEmail = SENDER_DISPLAY_NAME + ' <' + DEFAULT_SENDER + '>';
      replyTo = undefined;
    }

    const payload = {
      from: senderEmail,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    // Defensive double-check: only attach reply_to if it's actually a valid format
    // that Resend will accept. extractBareEmail already guarantees this, but the
    // explicit check protects against future refactors.
    if (replyTo && isValidEmailField(replyTo)) payload.reply_to = replyTo;

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
