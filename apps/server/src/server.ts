import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';
import { basicAuth } from 'hono/basic-auth';
import { DomainException } from '@qwery/domain/exceptions';
import { createChatRoutes } from './routes/chat';
import { createConversationsRoutes } from './routes/conversations';

function handleError(error: unknown): Response {
  if (error instanceof DomainException) {
    const status =
      error.code >= 2000 && error.code < 3000
        ? 404
        : error.code >= 400 && error.code < 500
          ? error.code
          : 500;
    return Response.json(
      {
        error: error.message,
        code: error.code,
        data: error.data,
      },
      { status },
    );
  }
  const errorMessage =
    error instanceof Error ? error.message : 'Internal server error';
  return Response.json({ error: errorMessage }, { status: 500 });
}

export function createApp() {
  const app = new Hono();

  app.use('*', logger());

  app.onError((err) => {
    return handleError(err);
  });

  const password = process.env.QWERY_SERVER_PASSWORD;
  if (password) {
    const username = process.env.QWERY_SERVER_USERNAME ?? 'qwery';
    app.use('*', basicAuth({ username, password }));
  }

  app.use(
    '*',
    cors({
      origin: (origin) => {
        if (!origin) return undefined;
        if (origin.startsWith('http://localhost:')) return origin;
        if (origin.startsWith('http://127.0.0.1:')) return origin;
        return origin;
      },
    }),
  );

  app.route('/chat', createChatRoutes());
  app.route('/conversations', createConversationsRoutes());

  app.get('/health', (c) => c.json({ status: 'ok' }));

  return app;
}
