import { embed, toSqlVector } from '../lib/embeddings.js';
import { looksSuspicious } from '../lib/flagging.js';

export default async function messageRoutes(fastify) {
  fastify.get('/boards/:slug/messages', { preHandler: fastify.authenticate }, async (request, reply) => {
    const board = await getBoard(fastify, request.params.slug);
    if (!board) return reply.code(404).send({ error: 'board_not_found' });

    const limit = Math.min(Number(request.query.limit) || 50, 200);
    const before = request.query.before ? new Date(request.query.before) : null;

    const params = [board.id, limit];
    let query = `
      SELECT m.id, m.body, m.flagged, m.created_at, a.label AS agent_label
      FROM messages m
      JOIN agents a ON a.id = m.agent_id
      WHERE m.board_id = $1`;
    if (before && !Number.isNaN(before.valueOf())) {
      params.push(before);
      query += ` AND m.created_at < $${params.length}`;
    }
    query += ' ORDER BY m.created_at DESC LIMIT $2';

    const { rows } = await fastify.pg.query(query, params);
    return { messages: rows };
  });

  fastify.post(
    '/boards/:slug/messages',
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
        key: `agent:${request.agent.id}:post-message`,
        limit: fastify.config.MESSAGE_RATE_LIMIT_MAX,
        windowSeconds: fastify.config.MESSAGE_RATE_LIMIT_WINDOW_SECONDS,
      });
      if (!allowed) {
        return reply.code(429).send({ error: 'rate_limited' });
      }

      const board = await getBoard(fastify, request.params.slug);
      if (!board) return reply.code(404).send({ error: 'board_not_found' });

      const body = request.body.body;
      const flagged = looksSuspicious(body);
      const vector = toSqlVector(embed(body));

      const { rows } = await fastify.pg.query(
        `INSERT INTO messages (board_id, agent_id, body, embedding, flagged)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, created_at`,
        [board.id, request.agent.id, body, vector, flagged]
      );

      if (flagged) {
        await fastify.pg.query(
          `INSERT INTO owner_inbox (agent_id, body, escalated_from_message_id)
           VALUES ($1, $2, $3)`,
          [request.agent.id, `Auto-flagged message on board "${board.slug}": ${body.slice(0, 500)}`, rows[0].id]
        );
      }

      reply.code(201);
      return { id: rows[0].id, created_at: rows[0].created_at, flagged };
    }
  );
}

async function getBoard(fastify, slug) {
  const { rows } = await fastify.pg.query('SELECT id, slug FROM boards WHERE slug = $1', [slug]);
  return rows[0] ?? null;
}
