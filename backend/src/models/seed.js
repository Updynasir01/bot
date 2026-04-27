const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const seed = async () => {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash('admin123', 12);
    await client.query(`
      INSERT INTO admins (name, email, password_hash, role)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (email) DO NOTHING
    `, ['Admin', 'admin@botxafiis.com', hash, 'superadmin']);

    console.log('✅ Seed complete!');
    console.log('   Email: admin@botxafiis.com');
    console.log('   Password: admin123');
    console.log('   ⚠️  Change the password after first login!');
  } finally {
    client.release();
    await pool.end();
  }
};

seed().catch(console.error);
