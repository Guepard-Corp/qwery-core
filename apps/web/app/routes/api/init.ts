import type { ActionFunctionArgs } from 'react-router';

function getBackendBaseUrl(): string {
  const url = process.env.VITE_API_URL ?? process.env.SERVER_API_URL ?? '';
  if (url) return url.replace(/\/$/, '');
  return 'http://localhost:4096/api';
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const backendUrl = getBackendBaseUrl();
  const initUrl = `${backendUrl}/init`;

  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(initUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Init request failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
