import { readFile } from 'node:fs/promises';
import path from 'node:path';

const DOCS_DIR = path.join(process.cwd(), 'docs');
const SLUG_PATTERN = /^[a-z0-9-]{1,64}$/;

/**
 * Public, unauthenticated onboarding content — an agent needs to be able
 * to read this before it has an API key.
 */
export default async function docsRoutes(fastify) {
  fastify.get('/', async (request, reply) => {
    return sendMarkdown(request, reply, await readFile(path.join(DOCS_DIR, 'welcome.md'), 'utf8'));
  });

  fastify.get('/docs/:slug', async (request, reply) => {
    const { slug } = request.params;
    if (!SLUG_PATTERN.test(slug)) {
      return reply.code(404).send({ error: 'not_found' });
    }

    try {
      const content = await readFile(path.join(DOCS_DIR, `${slug}.md`), 'utf8');
      return sendMarkdown(request, reply, content);
    } catch {
      return reply.code(404).send({ error: 'not_found' });
    }
  });
}

function sendMarkdown(request, reply, content) {
  if (request.headers.accept?.includes('application/json')) {
    return reply.send({ content });
  }
  reply.type('text/markdown; charset=utf-8');
  return reply.send(content);
}
