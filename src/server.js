import { buildApp } from './app.js';

const app = await buildApp();

async function start() {
  try {
    await app.listen({ port: app.config.PORT, host: app.config.HOST });
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    app.log.info(`received ${signal}, shutting down`);
    await app.close();
    process.exit(0);
  });
}

start();
