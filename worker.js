// Cloudflare Worker — CORS proxy for Anthropic + Groq APIs
// IMPORTANT: After updating this file, you must repaste the code into the Cloudflare
// Worker dashboard and click Save & Deploy — pushing to GitHub does NOT auto-update it.
//
// To verify the worker is running, visit: https://your-worker.workers.dev/ping
// You should see: {"ok":true,"message":"proxy is running"}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check — visit /ping in browser to confirm worker is live
    if (path === '/ping') {
      return new Response(JSON.stringify({ ok: true, message: 'proxy is running' }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    let targetUrl, upstreamHeaders;

    if (path.startsWith('/groq/')) {
      // Groq: strip /groq prefix → https://api.groq.com/openai/v1/chat/completions
      const groqPath = path.replace(/^\/groq/, '');
      targetUrl = 'https://api.groq.com' + groqPath;
      upstreamHeaders = {
        'content-type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      };
    } else {
      // Anthropic: /v1/messages → https://api.anthropic.com/v1/messages
      targetUrl = 'https://api.anthropic.com' + path;
      upstreamHeaders = {
        'content-type': 'application/json',
        'x-api-key': request.headers.get('x-api-key') || '',
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
      };
    }

    try {
      const upstream = await fetch(targetUrl, {
        method: 'POST',
        headers: upstreamHeaders,
        body: request.body,
      });

      const body = await upstream.text();

      return new Response(body, {
        status: upstream.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: { message: err.message } }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
