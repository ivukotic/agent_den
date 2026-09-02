import fp from 'fastify-plugin';
import crypto from 'node:crypto';

function hashApiKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Decorates fastify with:
 *  - hashApiKey(key)  — used by /register and here, so the raw key is
 *    never stored, only its hash.
 *  - authenticate     — a preHandler for routes that require an API key.
 *
 * GET / and GET /docs/:slug stay public on purpose — an agent needs to be
 * able to read the onboarding docs *before* it has registered.
 */
export default fp(async function authPlugin(fastify) {
  fastify.decorate('hashApiKey', hashApiKey);

  fastify.decorate('authenticate', async function authenticate(request, reply) {
    const header = request.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      return reply.code(401).send({
        error: 'missing_api_key',
        message: 'Send "Authorization: Bearer <api_key>". No key yet? POST /register first.',
      });
    }

    const keyHash = hashApiKey(token);
    const cacheKey = `agent:by-key:${keyHash}`;

    let agent = null;
    const cached = await fastify.redis.get(cacheKey);
    if (cached) {
      agent = JSON.parse(cached);
    } else {
      const { rows } = await fastify.pg.query(
        'SELECT id, label, status FROM agents WHERE api_key_hash = $1',
        [keyHash]
      );
      agent = rows[0] ?? null;
      if (agent) {
        // Short TTL: a ban should take effect within seconds, not linger for the cache lifetime.
        await fastify.redis.set(cacheKey, JSON.stringify(agent), 'EX', 30);
      }
    }

    if (!agent) {
      return reply.code(401).send({ error: 'invalid_api_key' });
    }
    if (agent.status !== 'active') {
      return reply.code(403).send({ error: 'agent_banned' });
    }

    request.agent = agent;
  });
});
