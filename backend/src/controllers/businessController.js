const pool = require('../models/db');
const fileService = require('../services/fileService');

const normalizeCode = (value = '') => value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);

const buildCodeCandidate = (name = '') => {
  const cleaned = normalizeCode(name);
  if (cleaned.length >= 4) return cleaned.slice(0, 8);
  return `BIZ${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
};

const generateUniqueBusinessCode = async (name) => {
  const base = buildCodeCandidate(name);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const suffix = attempt === 0 ? '' : `${Math.floor(100 + Math.random() * 900)}`;
    const candidate = normalizeCode(`${base}${suffix}`).slice(0, 10);
    const existing = await pool.query('SELECT id FROM businesses WHERE business_code = $1 LIMIT 1', [candidate]);
    if (existing.rows.length === 0) return candidate;
  }

  return `BIZ${Date.now().toString().slice(-6)}`;
};

const addSharedLink = (business) => {
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || '';
  const botNumber = twilioFrom.replace('whatsapp:', '').replace(/\s+/g, '');
  if (!botNumber || !business?.business_code) return business;

  const encodedText = encodeURIComponent(`Hi ${business.business_code}`);
  return {
    ...business,
    shared_whatsapp_link: `https://wa.me/${botNumber.replace('+', '')}?text=${encodedText}`
  };
};

// GET all businesses with stats
const getAll = async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        b.*,
        COUNT(DISTINCT m.id) as total_messages,
        COUNT(DISTINCT m.from_number) as unique_customers,
        MAX(m.created_at) as last_message_at,
        COUNT(DISTINCT bf.id) as file_count
      FROM businesses b
      LEFT JOIN messages m ON m.business_id = b.id
      LEFT JOIN business_files bf ON bf.business_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (status && status !== 'all') {
      params.push(status);
      query += ` AND b.status = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      query += ` AND (b.name ILIKE $${params.length} OR b.whatsapp_number ILIKE $${params.length} OR b.owner_name ILIKE $${params.length} OR b.business_code ILIKE $${params.length})`;
    }

    query += ` GROUP BY b.id ORDER BY b.created_at DESC`;
    params.push(limit, offset);
    query += ` LIMIT $${params.length - 1} OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) FROM businesses WHERE 1=1`;
    const countParams = [];
    if (status && status !== 'all') { countParams.push(status); countQuery += ` AND status = $${countParams.length}`; }
    if (search) { countParams.push(`%${search}%`); countQuery += ` AND (name ILIKE $${countParams.length} OR whatsapp_number ILIKE $${countParams.length})`; }
    const countResult = await pool.query(countQuery, countParams);

    res.json({
      businesses: result.rows.map(addSharedLink),
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      pages: Math.ceil(countResult.rows[0].count / limit)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// GET single business with full details
const getOne = async (req, res) => {
  try {
    const { id } = req.params;

    const bizResult = await pool.query(`
      SELECT b.*,
        COUNT(DISTINCT m.id) as total_messages,
        COUNT(DISTINCT m.from_number) as unique_customers
      FROM businesses b
      LEFT JOIN messages m ON m.business_id = b.id
      WHERE b.id = $1
      GROUP BY b.id
    `, [id]);

    if (bizResult.rows.length === 0) return res.status(404).json({ error: 'Business not found' });

    const files = await pool.query('SELECT * FROM business_files WHERE business_id = $1', [id]);
    const recentMessages = await pool.query(
      'SELECT * FROM messages WHERE business_id = $1 ORDER BY created_at DESC LIMIT 20', [id]
    );
    const payments = await pool.query(
      'SELECT * FROM payments WHERE business_id = $1 ORDER BY created_at DESC', [id]
    );

    res.json({
      business: addSharedLink(bizResult.rows[0]),
      files: files.rows,
      recentMessages: recentMessages.rows,
      payments: payments.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// CREATE business
const create = async (req, res) => {
  try {
    const {
      name, owner_name, whatsapp_number, business_type, city, description,
      plan, monthly_fee, greeting_somali, greeting_english, language_preference,
      business_hours, after_hours_message
    } = req.body;

    if (!name || !whatsapp_number || !business_type) {
      return res.status(400).json({ error: 'Name, WhatsApp number, and business type are required' });
    }

    // Check duplicate number
    const existing = await pool.query('SELECT id FROM businesses WHERE whatsapp_number = $1', [whatsapp_number]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'WhatsApp number already registered' });

    const fee = monthly_fee || (plan === 'pro' ? 100 : plan === 'enterprise' ? 200 : 50);
    const dueDate = new Date();
    dueDate.setMonth(dueDate.getMonth() + 1);

    const businessCode = await generateUniqueBusinessCode(name);

    const result = await pool.query(`
      INSERT INTO businesses (
        name, owner_name, whatsapp_number, business_type, city, description,
        plan, monthly_fee, greeting_somali, greeting_english, language_preference,
        business_hours, after_hours_message, payment_due_date, status, business_code
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',$15)
      RETURNING *
    `, [
      name, owner_name, whatsapp_number, business_type, city, description,
      plan || 'basic', fee,
      greeting_somali || 'Ku soo dhawoow! Sideen kuu caawin karaa? 🌟',
      greeting_english || 'Welcome! How can I help you today? 🌟',
      language_preference || 'both',
      business_hours || 'Sat-Thu 8am-9pm',
      after_hours_message || 'Xafiiska waa xiran yahay. We are currently closed. ⏰',
      dueDate,
      businessCode
    ]);

    res.status(201).json({ business: addSharedLink(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// UPDATE business
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const fields = req.body;
    const allowed = [
      'name','owner_name','business_type','city','description','plan','monthly_fee',
      'status','bot_active','greeting_somali','greeting_english','language_preference',
      'business_hours','after_hours_message','is_paid','knowledge_base'
    ];

    const updates = [];
    const values = [];
    Object.entries(fields).forEach(([key, val]) => {
      if (allowed.includes(key)) {
        values.push(val);
        updates.push(`${key} = $${values.length}`);
      }
    });

    if (updates.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    values.push(id);
    const result = await pool.query(
      `UPDATE businesses SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Business not found' });
    res.json({ business: addSharedLink(result.rows[0]) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// DELETE business
const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM businesses WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Business not found' });
    res.json({ message: 'Business deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Toggle bot active/inactive
const toggleBot = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE businesses SET 
        bot_active = NOT bot_active, 
        status = CASE WHEN bot_active THEN 'inactive' ELSE 'active' END,
        updated_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ business: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Dashboard stats
const getStats = async (req, res) => {
  try {
    const stats = await pool.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'pending') as pending,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE is_paid = false) as unpaid,
        SUM(CASE WHEN status = 'active' THEN monthly_fee ELSE 0 END) as monthly_revenue
      FROM businesses
    `);

    const msgStats = await pool.query(`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT from_number) as unique_customers,
        COUNT(DISTINCT business_id) as active_bots
      FROM messages
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    const revenueByMonth = await pool.query(`
      SELECT 
        TO_CHAR(date_trunc('month', created_at), 'Mon') as month,
        SUM(amount) as revenue
      FROM payments
      WHERE status = 'paid' AND created_at > NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', created_at)
      ORDER BY date_trunc('month', created_at)
    `);

    res.json({
      businesses: stats.rows[0],
      messages: msgStats.rows[0],
      revenueByMonth: revenueByMonth.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAll, getOne, create, update, remove, toggleBot, getStats };
