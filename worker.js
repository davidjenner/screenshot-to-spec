// Cloudflare Worker — CORS proxy for Anthropic API
// Deploy at: https://dash.cloudflare.com → Workers & Pages → Create Worker
// Paste this code, deploy, then copy the worker URL into index.html

export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version, anthropic-dangerous-allow-browser',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const url = new URL(request.url);
    const target = 'https://api.anthropic.com' + url.pathname;

    const upstream = await fetch(target, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': request.headers.get('x-api-key') || '',
        'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01',
      },
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
