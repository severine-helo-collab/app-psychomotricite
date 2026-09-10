const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mahelochlo72!@db.iyxurkbceiirjdigcyak.supabase.co:5432/postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('connect', () => {
  console.log('Connecté à la base de données Supabase PostgreSQL !');
});

module.exports = pool;