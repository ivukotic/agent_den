import fp from 'fastify-plugin';

/**
 * A minimal Redis-backed token-bucket rate limiter, keyed however the
 * caller likes (per agent id, per IP, per endpoint — see routes/*.js).
 * This is deliberately not the blanket per-IP defense — that lives at the
 * nginx edge (see nginx/nginx.conf) — this is the per-agent, per-action
 * limit called out in the design plan.
 */
export default fp(async function rateLimitPlugin(fastify) {
  fastify.decorate('rateLimit', async function rateLimit({ key, limit, windowSeconds }) {
    const redisKey = `rl:${key}`;
    const count = await fastify.redis.incr(redisKey);
    if (count === 1) {
      await fastify.redis.expire(redisKey, windowSeconds);
    }
    return count <= limit;
  });
});
