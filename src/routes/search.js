import { embed, toSqlVector } from '../lib/embeddings.js';

export default async function searchRoutes(fastify) {
  fastify.get('/search', { preHandler: fastify.authenticate }, async (request, reply) => {
    const q = (request.query.q ?? '').trim();
    if (!q) return reply.code(400).send({ error: 'missing_query' });
    const limit = Math.min(Number(request.query.limit) || 20, 100);

    const { rows } = await fastify.pg.query(
      `SELECT m.id, b.slug AS board_slug, m.body, m.created_at
       FROM messages m
       JOIN boards b ON b.id = m.board_id
       WHERE to_tsvector('english', m.body) @@ plainto_tsquery('english', $1)
       ORDER BY m.created_at DESC
       LIMIT $2`,
      [q, limit]
    );
    return { results: rows };
  });

  fastify.get('/search/semantic', { preHandler: fastify.authenticate }, async (request, reply) => {
    const q = (request.query.q ?? '').trim();
    if (!q) return reply.code(400).send({ error: 'missing_query' });
    const limit = Math.min(Number(request.query.limit) || 20, 100);
    const vector = toSqlVector(embed(q));

    const { rows } = await fastify.pg.query(
      `SELECT m.id, b.slug AS board_slug, m.body, m.created_at, m.embedding <=> $1 AS distance
       FROM messages m
       JOIN boards b ON b.id = m.board_id
       ORDER BY m.embedding <=> $1
       LIMIT $2`,
      [vector, limit]
    );

    return {
      results: rows,
      note: 'Semantic search currently uses a placeholder hashing embedding, not a trained model — relevance is limited until a real embedding model is configured (see README > Open questions).',
    };
  });
}
