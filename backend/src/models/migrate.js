const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const migrate = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Admins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'admin',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Businesses (clients) table
    await client.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        owner_name VARCHAR(255),
        whatsapp_number VARCHAR(50) UNIQUE NOT NULL,
        business_type VARCHAR(100) NOT NULL,
        city VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        plan VARCHAR(50) DEFAULT 'basic',
        monthly_fee INTEGER DEFAULT 50,
        is_paid BOOLEAN DEFAULT false,
        payment_due_date TIMESTAMP,
        bot_active BOOLEAN DEFAULT false,
        greeting_somali TEXT DEFAULT 'Ku soo dhawoow! Sideen kuu caawin karaa? 🌟',
        greeting_english TEXT DEFAULT 'Welcome! How can I help you today? 🌟',
        language_preference VARCHAR(50) DEFAULT 'both',
        business_hours VARCHAR(255),
        after_hours_message TEXT DEFAULT 'Xafiiska waa xiran yahay. We are currently closed. ⏰',
        knowledge_base TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Uploaded files table
    await client.query(`
      CREATE TABLE IF NOT EXISTS business_files (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        file_type VARCHAR(50) NOT NULL,
        original_name VARCHAR(255) NOT NULL,
        stored_name VARCHAR(255) NOT NULL,
        file_path VARCHAR(500) NOT NULL,
        extracted_text TEXT,
        processed BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Messages/conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        from_number VARCHAR(50) NOT NULL,
        message_body TEXT NOT NULL,
        direction VARCHAR(20) NOT NULL,
        bot_response TEXT,
        response_time_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Payments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        amount INTEGER NOT NULL,
        currency VARCHAR(10) DEFAULT 'USD',
        status VARCHAR(50) DEFAULT 'pending',
        payment_method VARCHAR(100),
        notes TEXT,
        paid_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Bot analytics table
    await client.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id SERIAL PRIMARY KEY,
        business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
        date DATE NOT NULL,
        total_messages INTEGER DEFAULT 0,
        unique_users INTEGER DEFAULT 0,
        avg_response_ms INTEGER DEFAULT 0,
        UNIQUE(business_id, date)
      )
    `);

    await client.query('COMMIT');
    console.log('✅ Database migration completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
};

migrate().catch(console.error);
