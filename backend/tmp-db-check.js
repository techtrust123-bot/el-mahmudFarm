const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const { buildFarmUri, resolveSrvMongoUri, getFarmConnection } = require('./utils/dbManager');

(async () => {
  const uri = process.env.MONGO_URI;
  console.log('MONGO_URI present:', !!uri);
  try {
    const resolved = await resolveSrvMongoUri(uri);
    console.log('resolvedUri present:', !!resolved);
    const farmUri = buildFarmUri(resolved, 'testfarm');
    console.log('farmUri:', farmUri);
    const conn = await getFarmConnection('testfarm');
    console.log('connection state:', conn.readyState, conn.name);
    await conn.close();
    console.log('closed');
  } catch (err) {
    console.error('connection error', err && err.name, err && err.message);
    if (err && err.cause) console.error('cause', err.cause);
    process.exit(1);
  }
})();
