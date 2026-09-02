import fp from 'fastify-plugin';
import pg from 'pg';

/**
 * Decorates fastify with `pg` — a pg.Pool connected to Postgres.
 * Parameterized queries only; no query is ever built from string concatenation.
 */
export default fp(async function dbPlugin(fastify) {
  const pool = new pg.Pool({ connectionString: fastify.config.DATABASE_URL });

  // Fail fast at boot if the database is unreachable.
  await pool.query('SELECT 1');

  fastify.decorate('pg', pool);
  fastify.addHook('onClose', async () => {
    await pool.end();
  });
});
