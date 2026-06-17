export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const keys = [process.env.ANTHROPIC_API_KEY, process.env.ANTHROPIC_API_KEY_2, process.env.ANTHROPIC_API_KEY_3, process.env.ANTHROPIC_API_KEY_4].filter(Boolean);
  if (keys.length === 0) return res.status(500).json({ error: { message: 'No ANTHROPIC_API_KEY set in Vercel environment variables' } });

  // Round-robin: rotate starting key so usage spreads evenly
  if (!global._brainKeyIdx) global._brainKeyIdx = 0;
  const startIdx = global._brainKeyIdx % keys.length;
  global._brainKeyIdx++;

  try {
    // stream: optional flag from client. When true, response is forwarded as
    // Server-Sent Events (text/event-stream) instead of one JSON blob. Used by
    // the Brain chat UI to deliver a typewriter effect. All other callers
    // (document import, quote upload, transcript cleanup) leave stream undefined
    // and continue to receive the original JSON-blob response.
    const { system, messages, tools, stream } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: { message: 'Messages array required' } });
    }

    // Model routing: simple queries use Haiku (fast/cheap), complex use Sonnet
    const lastMsg = messages[messages.length - 1];
    let lastText = '';
    if (lastMsg && lastMsg.content) {
      if (typeof lastMsg.content === 'string') lastText = lastMsg.content;
      else if (Array.isArray(lastMsg.content)) {
        lastText = lastMsg.content.filter(c => c.type === 'text').map(c => c.text || '').join(' ');
      }
    }
    const txt = lastText.toLowerCase().trim();
    const wordCount = txt.split(/\s+/).filter(Boolean).length;
    const hasAttachment = Array.isArray(lastMsg?.content) && lastMsg.content.some(c => c.type === 'document' || c.type === 'image');
    const hasToolUse = messages.some(m => Array.isArray(m.content) && m.content.some(c => c.type === 'tool_use' || c.type === 'tool_result'));

    // Complex signals -> always Sonnet
    const complexKeywords = ['analyze','compare','strategy','strategize','exit readiness','deep dive','comprehensive','recommendation','proposal','draft','write','generate','create','build','plan','breakdown','forecast','margin','commission','reconcile','audit','investigate','research','explain why','walk me through','step by step','optimize','review','evaluate','assess','calculate','compute','financials','report','export','summary','summarize','find','search'];
    const isComplex = hasAttachment || hasToolUse || wordCount > 25 || complexKeywords.some(k => txt.includes(k));

    // Simple signals -> Haiku
    const simpleKeywords = ['hi','hello','hey','thanks','thank you','yes','no','ok','okay','got it','cool','nice','great','what time','what day','what date','status','count','how many','total','quick','simple','list','show me','display'];
    const isSimple = !isComplex && (wordCount <= 12 || simpleKeywords.some(k => txt === k || txt.startsWith(k+' ') || txt.endsWith(' '+k)));

    const selectedModel = isSimple ? 'claude-haiku-4-5' : 'claude-sonnet-4-5';
    const selectedMaxTokens = isSimple ? 2048 : 8192;

    // Prompt caching: wrap system prompt and tools with cache_control markers.
    // Anthropic caches large repetitive context across requests; subsequent calls
    // within ~5 min hit the cache (10x cheaper input tokens, faster response).
    // Cache only kicks in if cached content is >= 1024 tokens for Sonnet (~4000 chars rough).
    const sysStr = system || '';
    const shouldCacheSystem = sysStr.length > 4000;
    const systemBlocks = shouldCacheSystem
      ? [{ type: 'text', text: sysStr, cache_control: { type: 'ephemeral' } }]
      : sysStr;

    const body = {
      model: selectedModel,
      max_tokens: selectedMaxTokens,
      system: systemBlocks,
      messages,
    };

    // When the client requested streaming, set stream:true on the upstream
    // Anthropic call so we receive SSE chunks instead of a single JSON.
    if (stream) body.stream = true;

    // Build tools: custom tools + web search (always on, Claude decides when to use)
    const allTools = [];
    if (tools && Array.isArray(tools) && tools.length > 0) {
      allTools.push(...tools);
    }
    allTools.push({ type: 'web_search_20250305', name: 'web_search', max_uses: 3 });
    // Cache the tools block too -- large tool definitions are reused across every call.
    // Mark cache_control on the LAST tool so all preceding tools are cached together.
    if (allTools.length > 0) {
      const totalToolsSize = JSON.stringify(allTools).length;
      if (totalToolsSize > 4000) {
        allTools[allTools.length - 1] = { ...allTools[allTools.length - 1], cache_control: { type: 'ephemeral' } };
      }
    }
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
            'anthropic-beta': 'pdfs-2024-09-25,prompt-caching-2024-07-31',
          },
          body: JSON.stringify(body),
        });

        // ============ STREAMING PATH ============
        // When the client asked for streaming AND the upstream call succeeded,
        // forward the SSE bytes through to the client unchanged. The client
        // parses the Anthropic SSE event format directly.
        // We only commit to the streaming path on a 200 OK -- if the upstream
        // returned a 4xx/5xx, fall through to the JSON error path so the client
        // can surface the error normally.
        if (stream && response.ok && response.body) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no'); // disable proxy buffering on some hosts
          if (typeof res.flushHeaders === 'function') res.flushHeaders();

          const reader = response.body.getReader();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              // Pass-through. value is a Uint8Array of SSE bytes.
              res.write(Buffer.from(value));
              if (typeof res.flush === 'function') res.flush();
            }
          } catch (streamErr) {
            // Surface stream errors to the client as a final SSE event so the
            // browser knows to stop reading and show an error.
            try {
              res.write('event: error\ndata: ' + JSON.stringify({ message: streamErr.message || 'Stream error' }) + '\n\n');
            } catch {}
          }
          try { res.end(); } catch {}
          return;
        }
        // ============ END STREAMING PATH ============

        const data = await response.json();

        if ((response.status === 429 || response.status === 529) && i < keys.length - 1) continue;

        if (data.error && data.error.type === 'not_found_error') {
          // Fallback uses a current bare alias (not a dated snapshot) so that if the
          // primary model is ever unavailable, the Brain degrades to a working model
          // instead of erroring. Dated snapshots get retired over time; aliases do not.
          const r2body = { ...body, model: 'claude-haiku-4-5', max_tokens: 4096 };
          // The fallback model also respects the streaming flag.
          if (stream) r2body.stream = true; else delete r2body.stream;
          const r2 = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
            body: JSON.stringify(r2body),
          });
          if (stream && r2.ok && r2.body) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache, no-transform');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            if (typeof res.flushHeaders === 'function') res.flushHeaders();
            const reader2 = r2.body.getReader();
            try {
              while (true) {
                const { done, value } = await reader2.read();
                if (done) break;
                res.write(Buffer.from(value));
                if (typeof res.flush === 'function') res.flush();
              }
            } catch (e) {
              try { res.write('event: error\ndata: ' + JSON.stringify({ message: e.message || 'Stream error' }) + '\n\n'); } catch {}
            }
            try { res.end(); } catch {}
            return;
          }
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
