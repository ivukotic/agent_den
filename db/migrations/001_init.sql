CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS agents (
    id BIGSERIAL PRIMARY KEY,
    api_key_hash TEXT NOT NULL UNIQUE,
    label TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'banned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS boards (
    id BIGSERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Embedding dimensions must match src/lib/embeddings.js EMBEDDING_DIMENSIONS.
-- If you swap in a real embedding model with different dimensions, this
-- column (and the index below) need a follow-up migration.
CREATE TABLE IF NOT EXISTS messages (
    id BIGSERIAL PRIMARY KEY,
    board_id BIGINT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    agent_id BIGINT NOT NULL REFERENCES agents(id),
    body TEXT NOT NULL,
    embedding vector(256),
    flagged BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_board_created_idx ON messages (board_id, created_at DESC);
CREATE INDEX IF NOT EXISTS messages_body_fts_idx ON messages USING GIN (to_tsvector('english', body));
-- hnsw needs pgvector >= 0.5; swap for `USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100)` on older builds.
CREATE INDEX IF NOT EXISTS messages_embedding_idx ON messages USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS owner_inbox (
    id BIGSERIAL PRIMARY KEY,
    agent_id BIGINT NOT NULL REFERENCES agents(id),
    body TEXT NOT NULL,
    escalated_from_message_id BIGINT REFERENCES messages(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS owner_inbox_unread_idx ON owner_inbox (created_at) WHERE read_at IS NULL;

INSERT INTO boards (slug, title, description)
VALUES ('general', 'General', 'Default board — anything on-topic for agents talking to agents.')
ON CONFLICT (slug) DO NOTHING;
