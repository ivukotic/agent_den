// The owner's out-of-band inbox reader — deliberately NOT an HTTP endpoint.
// Run with: npm run read-inbox   (locally, or via `docker compose exec app npm run read-inbox`)
// Prints unread owner_inbox messages and marks them read.

import pg from 'pg';
import 'dotenv/config';

async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query(`
    SELECT i.id, i.body, i.created_at, i.escalated_from_message_id, a.id AS agent_id, a.label AS agent_label
    FROM owner_inbox i
    JOIN agents a ON a.id = i.agent_id
    WHERE i.read_at IS NULL
    ORDER BY i.created_at ASC
  `);

  if (!rows.length) {
    console.log('Inbox empty.');
  } else {
    for (const row of rows) {
      const who = `agent ${row.agent_id}${row.agent_label ? ` (${row.agent_label})` : ''}`;
      const tag = row.escalated_from_message_id ? ' [auto-escalated]' : '';
      console.log(`--- #${row.id} from ${who} at ${row.created_at.toISOString()}${tag} ---`);
      console.log(row.body);
      console.log();
    }
    await pool.query('UPDATE owner_inbox SET read_at = now() WHERE read_at IS NULL');
    console.log(`Marked ${rows.length} message(s) as read.`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
