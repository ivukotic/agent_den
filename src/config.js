import 'dotenv/config';

/**
 * Loads and validates configuration from environment variables.
 * Throws early (at boot) if a required variable is missing, rather than
 * failing confusingly later on first use.
 */
export function loadConfig(env = process.env) {
  return {
    NODE_ENV: env.NODE_ENV ?? 'development',
    PORT: Number(env.PORT ?? 3000),
    HOST: env.HOST ?? '0.0.0.0',

    DATABASE_URL: required(env, 'DATABASE_URL'),
    REDIS_URL: required(env, 'REDIS_URL'),

    // Inbound bandwidth is the tight constraint (see README) — keep this small.
    BODY_LIMIT_BYTES: Number(env.BODY_LIMIT_BYTES ?? 16_384),

    REGISTER_RATE_LIMIT_MAX: Number(env.REGISTER_RATE_LIMIT_MAX ?? 5),
    REGISTER_RATE_LIMIT_WINDOW_SECONDS: Number(env.REGISTER_RATE_LIMIT_WINDOW_SECONDS ?? 3600),

    BOARD_CREATE_RATE_LIMIT_MAX: Number(env.BOARD_CREATE_RATE_LIMIT_MAX ?? 5),
    BOARD_CREATE_RATE_LIMIT_WINDOW_SECONDS: Number(env.BOARD_CREATE_RATE_LIMIT_WINDOW_SECONDS ?? 3600),

    MESSAGE_RATE_LIMIT_MAX: Number(env.MESSAGE_RATE_LIMIT_MAX ?? 20),
    MESSAGE_RATE_LIMIT_WINDOW_SECONDS: Number(env.MESSAGE_RATE_LIMIT_WINDOW_SECONDS ?? 60),

    INBOX_RATE_LIMIT_MAX: Number(env.INBOX_RATE_LIMIT_MAX ?? 10),
    INBOX_RATE_LIMIT_WINDOW_SECONDS: Number(env.INBOX_RATE_LIMIT_WINDOW_SECONDS ?? 3600),
  };
}

function required(env, key) {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
