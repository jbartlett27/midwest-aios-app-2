export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Collect all available API keys for rotation
  const keys = [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY_2].filter(Boolean);
  if (keys.length === 0) return res.status(500).json({ error: { message: 'No ANTHROPIC_API_KEY set in Vercel environment variables' } });

  try {
    const { system, messages, tools } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: { message: 'Messages array required' } });
    }
    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: system || '',
      messages,
    };
    if (tools && Array.isArray(tools) && tools.length > 0) {
      body.tools = tools;
    }

    // Try each key in order -- if one hits rate limit or error, try the next
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();

        // If rate limited or overloaded and we have another key, try next
        if ((response.status === 429 || response.status === 529) && i < keys.length - 1) {
          continue;
        }

        // If model not found, try fallback model with same key
        if (data.error && data.error.type === 'not_found_error') {
          const r2 = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify({ ...body, model: 'claude-3-5-sonnet-20241022', max_tokens: 4096 }),
          });
          const d2 = await r2.json();
          if ((r2.status === 429 || r2.status === 529) && i < keys.length - 1) continue;
          return res.status(r2.status).json(d2);
        }

        // If auth error (invalid key) and we have another key, try next
        if (response.status === 401 && i < keys.length - 1) {
          continue;
        }

        return res.status(response.status).json(data);
      } catch (err) {
        // Network error on this key -- try next if available
        if (i < keys.length - 1) continue;
        return res.status(500).json({ error: { message: 'All API keys failed: ' + err.message } });
      }
    }

    return res.status(500).json({ error: { message: 'All API keys exhausted' } });
  } catch (error) {
    return res.status(500).json({ error: { message: 'Server error: ' + error.message } });
  }
}
