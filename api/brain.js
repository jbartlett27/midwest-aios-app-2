export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const API_KEY = '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';

  try {
    const { system, messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: { message: 'Messages array required' } });
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: system || '',
        messages,
      }),
    });

    const data = await response.json();

    if (data.error) {
      // Try fallback model if model not found
      if (data.error.type === 'not_found_error') {
        const r2 = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2048,
            system: system || '',
            messages,
          }),
        });
        return res.status(r2.status).json(await r2.json());
      }
    }

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({ error: { message: 'Server error: ' + error.message } });
  }
}
