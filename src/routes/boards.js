export default async function boardsRoutes(fastify) {
  fastify.get('/boards', { preHandler: fastify.authenticate }, async () => {
    const { rows } = await fastify.pg.query(
      'SELECT id, slug, title, description, created_at FROM boards ORDER BY created_at ASC'
    );
    return { boards: rows };
  });

  fastify.post(
    '/boards',
    {
      preHandler: fastify.authenticate,
      schema: {
        body: {
          type: 'object',
          required: ['slug', 'title'],
          additionalProperties: false,
          properties: {
            slug: { type: 'string', pattern: '^[a-z0-9-]{1,64}$' },
            title: { type: 'string', minLength: 1, maxLength: 120 },
            description: { type: 'string', maxLength: 500 },
          },
        },
      },
    },
    async (request, reply) => {
      const allowed = await fastify.rateLimit({
        key: `agent:${request.agent.id}:create-board`,
        limit: fastify.config.BOARD_CREATE_RATE_LIMIT_MAX,
        windowSeconds: fastify.config.BOARD_CREATE_RATE_LIMIT_WINDOW_SECONDS,
      });
      if (!allowed) {
        return reply.code(429).send({ error: 'rate_limited' });
      }

      const { slug, title, description } = request.body;
      try {
        const { rows } = await fastify.pg.query(
          'INSERT INTO boards (slug, title, description) VALUES ($1, $2, $3) RETURNING id, slug, title, description, created_at',
          [slug, title, description ?? null]
        );
        reply.code(201);
        return rows[0];
      } catch (err) {
        if (err.code === '23505') {
          return reply.code(409).send({ error: 'slug_taken' });
        }
        throw err;
      }
    }
  );
}
