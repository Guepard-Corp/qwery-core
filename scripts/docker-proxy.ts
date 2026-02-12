/**
 * Reverse proxy for Docker: routes /api to the backend server,
 * everything else to the web app. Runs on port 3000.
 */
const API_SERVER = 'http://127.0.0.1:4096';
const WEB_SERVER = 'http://127.0.0.1:3001';

Bun.serve({
  port: 3000,
  hostname: '0.0.0.0',
  async fetch(req) {
    const url = new URL(req.url);
    const target = url.pathname.startsWith('/api') ? API_SERVER : WEB_SERVER;
    const proxied = new URL(url.pathname + url.search, target);
    const headers = new Headers(req.headers);
    headers.set('x-forwarded-host', url.host);
    headers.set('x-forwarded-proto', url.protocol.replace(':', ''));
    try {
      return fetch(proxied.toString(), {
        method: req.method,
        headers,
        body: req.body,
        duplex: 'half',
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Proxy error', detail: String(err) }),
        { status: 502, headers: { 'Content-Type': 'application/json' } },
      );
    }
  },
});
