import fp from 'fastify-plugin';
import Redis from 'ioredis';

/**
 * Decorates fastify with `redis` — used for the API-key lookup cache and
 * the per-agent rate limiters (see plugins/rateLimit.js).
 */
export default fp(async function redisPlugin(fastify) {
  const redis = new Redis(fastify.config.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  await redis.ping();

  fastify.decorate('redis', redis);
  fastify.addHook('onClose', async () => {
    redis.disconnect();
  });
});
