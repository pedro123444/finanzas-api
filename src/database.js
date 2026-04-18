const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_lixUEVnmG2v7@ep-odd-boat-an5jhbtl.c-6.us-east-1.aws.neon.tech/neondb?sslmode=require',
});

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
};
