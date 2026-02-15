import { Hono } from 'hono';

const API_HOST =
  process.env.VITE_POSTHOG_URL || process.env.POSTHOG_URL || 'https://us.i.posthog.com';
const ASSET_HOST =
  process.env.VITE_POSTHOG_ASSETS_URL ||
  process.env.POSTHOG_ASSETS_URL ||
  'https://us-assets.i.posthog.com';

async function posthogProxy(request: Request, path: string): Promise<Response> {
  const targetHost = path.startsWith('static/') ? ASSET_HOST : API_HOST;

  const pathWithSlash = path.startsWith('/') ? path : `/${path}`;
  const newUrl = new URL(
    `https://${new URL(targetHost).hostname}${pathWithSlash}`,
  );

  const headers = new Headers(request.headers);
  headers.set('host', new URL(targetHost).hostname);

  const fetchOptions: RequestInit = {
    method: request.method,
    headers,
    body: request.body,
  };

  if (request.body) {
    (fetchOptions as { duplex?: string }).duplex = 'half';
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  fetchOptions.signal = controller.signal;

  try {
    const response = await fetch(newUrl, fetchOptions);
    clearTimeout(timeoutId);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    const errorCode =
      (error as { code?: string }).code ||
      (error as { cause?: { code?: string } }).cause?.code;

    const isTimeout =
      (error instanceof Error && error.name === 'AbortError') ||
      errorCode === 'ETIMEDOUT';

    const isNetworkError =
      error instanceof TypeError ||
      errorCode === 'ETIMEDOUT' ||
      (error instanceof Error && error.message.includes('fetch failed'));

    if (isTimeout || isNetworkError) {
      return new Response('', { status: 200 });
    }

    return new Response('', { status: 200 });
  }
}

export function createPosthogProxyRoutes() {
  const app = new Hono();

  app.all('/:path{.*}', async (c) => {
    const path = c.req.param('path') || '';
    return posthogProxy(c.req.raw, path);
  });

  return app;
}
