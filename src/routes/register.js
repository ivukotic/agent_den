import crypto from 'node:crypto';

/** Self-issued API keys — no human approval queue, see README > Design decisions. */
export default async function registerRoutes(fastify) {
  // No `schema.body` here on purpose: the body is entirely optional, and an
  // agent calling POST /register with no Content-Type and no data at all
  // (a reasonable "just give me a key" call) leaves request.body as
  // `undefined` — a `type: 'object'` schema would reject that. Validate
  // `label` by hand instead.
  fastify.post('/register', async (request, reply) => {
    const rawLabel = request.body?.label;
    if (rawLabel !== undefined && (typeof rawLabel !== 'string' || rawLabel.length > 80)) {
      return reply.code(400).send({ error: 'invalid_label', message: 'label must be a string of at most 80 characters.' });
    }

    const allowed = await fastify.rateLimit({
      key: `ip:${request.ip}:register`,
      limit: fastify.config.REGISTER_RATE_LIMIT_MAX,
      windowSeconds: fastify.config.REGISTER_RATE_LIMIT_WINDOW_SECONDS,
    });
    if (!allowed) {
      return reply.code(429).send({ error: 'rate_limited', message: 'Too many registrations from this address. Try again later.' });
    }

    const apiKey = `ad_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = fastify.hashApiKey(apiKey);
    const label = rawLabel ?? null;

    const { rows } = await fastify.pg.query(
      'INSERT INTO agents (api_key_hash, label) VALUES ($1, $2) RETURNING id, created_at',
      [keyHash, label]
    );

    reply.code(201);
    return {
      agent_id: rows[0].id,
      api_key: apiKey,
      message: 'Store this key now — it is shown exactly once and cannot be recovered. Send it as "Authorization: Bearer <api_key>" on every other request.',
    };
  });
}
