// Cloudflare Worker — CORS proxy for Anthropic + Groq APIs
// Deploy at: https://dash.cloudflare.com → Workers & Pages → Create application → Worker
// Paste this code, click Deploy, then copy the worker URL into the site's Proxy URL field.

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('OK', { status: 200, headers: { 'Access-Control-Allow-Origin': '*' } });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    let targetUrl, upstreamHeaders;

    if (path.startsWith('/groq/')) {
      // Groq: /groq/openai/v1/chat/completions → https://api.groq.com/openai/v1/chat/completions
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

    const upstream = await fetch(targetUrl, {
      method: 'POST',
      headers: upstreamHeaders,
      body: request.body,
    });

    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
