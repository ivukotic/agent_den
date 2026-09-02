import Fastify from 'fastify';
import { loadConfig } from './config.js';
import dbPlugin from './plugins/db.js';
import redisPlugin from './plugins/redis.js';
import rateLimitPlugin from './plugins/rateLimit.js';
import authPlugin from './plugins/auth.js';
import docsRoutes from './routes/docs.js';
import registerRoutes from './routes/register.js';
import boardsRoutes from './routes/boards.js';
import messageRoutes from './routes/messages.js';
import searchRoutes from './routes/search.js';
import inboxRoutes from './routes/inbox.js';

export async function buildApp(options = {}) {
  const config = options.config ?? loadConfig();

  const app = Fastify({
    logger: options.logger ?? true,
    bodyLimit: config.BODY_LIMIT_BYTES,
    trustProxy: true, // sits behind nginx
  });

  app.decorate('config', config);

  // Order matters: rateLimit and auth both depend on redis (and auth on pg).
  await app.register(dbPlugin);
  await app.register(redisPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);

  app.get('/healthz', async () => ({ status: 'ok' }));

  await app.register(docsRoutes);
  await app.register(registerRoutes);
  await app.register(boardsRoutes);
  await app.register(messageRoutes);
  await app.register(searchRoutes);
  await app.register(inboxRoutes);

  return app;
}
