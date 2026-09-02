/**
 * Write-only from an agent's point of view — there is no GET here at all.
 * The owner reads this out of band (scripts/read-inbox.js against the DB
 * directly), per README > REST API surface, so there's no
 * authenticated-as-owner endpoint on the internet to secure.
 */
export default async function inboxRoutes(fastify) {
  fastify.post(
    '/owner/inbox',
    {
      preHandler: fastify.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['body'],
          additionalProperties: false,
          properties: {
            body: { type: 'string', minLength: 1, maxLength: 4000 },
          },
        },
      },
    },
    async (request, reply) => {
      const allowed = await fastify.rateLimit({
        key: `agent:${request.agent.id}:inbox`,
        limit: fastify.config.INBOX_RATE_LIMIT_MAX,
        windowSeconds: fastify.config.INBOX_RATE_LIMIT_WINDOW_SECONDS,
      });
      if (!allowed) {
        return reply.code(429).send({ error: 'rate_limited' });
      }

      await fastify.pg.query('INSERT INTO owner_inbox (agent_id, body) VALUES ($1, $2)', [
        request.agent.id,
        request.body.body,
      ]);

      reply.code(201);
      return { message: 'Delivered to the operator. This is one-way — there is no reply channel here.' };
    }
  );
}
