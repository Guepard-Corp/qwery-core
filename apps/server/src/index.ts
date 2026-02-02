import { createApp } from './server';

const PORT = Number(process.env.PORT ?? 4096);
const HOSTNAME = process.env.HOSTNAME ?? '0.0.0.0';

const app = createApp();

const server = Bun.serve({
  port: PORT,
  hostname: HOSTNAME,
  fetch: app.fetch,
  idleTimeout: 120,
});

console.log(`[Server] Listening on http://${server.hostname}:${server.port}`);
