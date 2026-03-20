export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const API_KEY = process.env.ANTHROPIC_API_KEY || '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';

  try {
    const { system, messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array required' });
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
    
    // If model not found, try fallback
    if (data.error && (data.error.message?.includes('model') || data.error.type === 'not_found_error')) {
      const fallback = await fetch('https://api.anthropic.com/v1/messages', {
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
      const fallbackData = await fallback.json();
      return res.status(fallback.status).json(fallbackData);
    }

    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Brain proxy error:', error);
    return res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
