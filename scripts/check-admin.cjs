const { createClient } = require('@libsql/client');
const client = createClient({ url: 'file:/home/z/my-project/db/custom.db' });
(async () => {
  const r = await client.execute('SELECT id, email, username, isAdmin FROM User');
  console.log('All users:');
  for (const row of r.rows) console.log(JSON.stringify(row));
})().catch(e => { console.error(e); process.exit(1); });
