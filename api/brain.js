// ---------------------------------------------------------------------------
// OUTPUT CEILINGS
// Lisa hit "That answer ran past the length limit" importing Braeside through
// the Brain: the turn spent its whole budget before it wrote anything the chat
// could render. These are the real per-model output caps the API enforces, so
// the Brain is CAPABLE of a maximum-length answer when a turn genuinely needs
// one. max_tokens is a ceiling, not a target -- Anthropic bills the tokens
// actually written, so a high ceiling costs nothing on a short answer.
// Everyday turns still run on a smaller working budget and only escalate to
// the full ceiling when a turn actually runs out of room.
const MODEL_OUTPUT_CAP = { 'claude-sonnet-5': 128000, 'claude-haiku-4-5': 64000 };
const DEFAULT_OUTPUT_CAP = 16384;
// A NON-streaming request whose max_tokens implies a possibly-10-minute
// generation is refused by the API with a "streaming is required" error, and
// would outlive the serverless invocation anyway. Document import, quote upload
// and transcript cleanup all run non-streamed, so they are held under that line
// while the Brain chat -- which streams -- gets the full model ceiling.
const NON_STREAM_CAP = 21333;
const outputCapFor = (model, streaming) => {
  const hard = MODEL_OUTPUT_CAP[model] || DEFAULT_OUTPUT_CAP;
  return streaming ? hard : Math.min(hard, NON_STREAM_CAP);
};

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

    const selectedModel = isSimple ? 'claude-haiku-4-5' : 'claude-sonnet-5';
    // Working budget: generous, but not the ceiling. A turn that actually runs
    // out of room is retried at the full ceiling further down, so a long answer
    // completes instead of being cut off. Clamped to what this model and this
    // transport (streamed vs not) can legally accept.
    const hardCap = outputCapFor(selectedModel, !!stream);
    const selectedMaxTokens = Math.min(isSimple ? 8192 : 64000, hardCap);

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

    // Forward an upstream SSE body to the client unchanged.
    const pipeSSE = async (upstream) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      if (typeof res.flushHeaders === 'function') res.flushHeaders();
      const rdr = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await rdr.read();
          if (done) break;
          res.write(Buffer.from(value));
          if (typeof res.flush === 'function') res.flush();
        }
      } catch (e) {
        try { res.write('event: error\ndata: ' + JSON.stringify({ message: e.message || 'Stream error' }) + '\n\n'); } catch {}
      }
      try { res.end(); } catch {}
    };

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

        // Self-heal on a ceiling mismatch. If a model's published output cap
        // ever changes under us, the API answers with the exact number it will
        // accept ("max_tokens: 128001 > 128000, which is the maximum allowed
        // number of output tokens for ..."). Retry once at that number rather
        // than handing the user a 400 they can do nothing about.
        if (!response.ok && data && data.error && typeof data.error.message === 'string') {
          const capMatch = /max_tokens:\s*\d+\s*>\s*(\d+)/.exec(data.error.message);
          const allowed = capMatch ? parseInt(capMatch[1], 10) : NaN;
          if (isFinite(allowed) && allowed > 0 && allowed < (body.max_tokens || 0)) {
            try {
              const fixBody = { ...body, max_tokens: allowed };
              const fr = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'x-api-key': key,
                  'anthropic-version': '2023-06-01',
                  'anthropic-beta': 'pdfs-2024-09-25,prompt-caching-2024-07-31',
                },
                body: JSON.stringify(fixBody),
              });
              if (stream && fr.ok && fr.body) { await pipeSSE(fr); return; }
              const fdata = await fr.json();
              return res.status(fr.status).json(fdata);
            } catch {}
          }
        }

        if (data.error && data.error.type === 'not_found_error') {
          // Fallback uses a current bare alias (not a dated snapshot) so that if the
          // primary model is ever unavailable, the Brain degrades to a working model
          // instead of erroring. Dated snapshots get retired over time; aliases do not.
          const r2body = { ...body, model: 'claude-haiku-4-5', max_tokens: Math.min(16384, outputCapFor('claude-haiku-4-5', !!stream)) };
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

        // A turn that spends its whole budget thinking comes back stop_reason
        // max_tokens with no text and no tool_use -- nothing the client can render.
        // Give it one more pass with a bigger ceiling before handing that back.
        if (response.ok && !stream && data && data.stop_reason === 'max_tokens' && Array.isArray(data.content)
            && !data.content.some(b => b && (b.type === 'text' || b.type === 'tool_use'))) {
          try {
            // Escalate to the full ceiling this model and transport allow --
            // the whole point of the retry is to give the turn enough room to
            // finish, so half measures just burn another round trip.
            const retryBody = { ...body, max_tokens: outputCapFor(body.model, false) };
            delete retryBody.stream;
            const rr = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': key,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'pdfs-2024-09-25,prompt-caching-2024-07-31',
              },
              body: JSON.stringify(retryBody),
            });
            const rdata = await rr.json();
            if (rr.ok && Array.isArray(rdata.content) && rdata.content.some(b => b && (b.type === 'text' || b.type === 'tool_use'))) {
              return res.status(rr.status).json(rdata);
            }
          } catch {}
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
