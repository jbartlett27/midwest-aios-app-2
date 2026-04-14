export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const keys = [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY_2].filter(Boolean);
  if (keys.length === 0) return res.status(500).json({ error: { message: 'No ANTHROPIC_API_KEY set in Vercel environment variables' } });

  try {
    const { system, messages, tools } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: { message: 'Messages array required' } });
    }
    const body = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: system || '',
      messages,
    };

    // Build tools: custom tools + web search (always on, Claude decides when to use)
    const allTools = [];
    if (tools && Array.isArray(tools) && tools.length > 0) {
      allTools.push(...tools);
    }
    allTools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 3 });
    body.tools = allTools;

    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'pdfs-2024-09-25',
          },
          body: JSON.stringify(body),
        });
        const data = await response.json();

        if ((response.status === 429 || response.status === 529) && i < keys.length - 1) continue;

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

        if (response.status === 401 && i < keys.length - 1) continue;
        return res.status(response.status).json(data);
      } catch (err) {
        if (i < keys.length - 1) continue;
        return res.status(500).json({ error: { message: 'All API keys failed: ' + err.message } });
      }
    }
    return res.status(500).json({ error: { message: 'All API keys exhausted' } });
  } catch (error) {
    return res.status(500).json({ error: { message: 'Server error: ' + error.message } });
  }
}
