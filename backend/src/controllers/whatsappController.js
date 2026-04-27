const pool = require('../models/db');
const aiService = require('../services/aiService');
const twilioService = require('../services/twilioService');

// Twilio webhook - incoming WhatsApp message
const handleIncoming = async (req, res) => {
  // Twilio expects TwiML response OR we respond via REST API
  const { From, To, Body } = req.body;

  // Respond 200 immediately so Twilio doesn't retry
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  try {
    const fromNumber = From.replace('whatsapp:', '');
    const toNumber = To.replace('whatsapp:', '');
    const messageText = Body?.trim();

    if (!messageText) return;

    // Find the business by WhatsApp number
    const bizResult = await pool.query(
      'SELECT * FROM businesses WHERE whatsapp_number = $1 AND bot_active = true AND status = $2',
      [toNumber, 'active']
    );

    if (bizResult.rows.length === 0) {
      console.log(`No active bot found for number: ${toNumber}`);
      return;
    }

    const business = bizResult.rows[0];
    const startTime = Date.now();

    // Save incoming message
    await pool.query(
      'INSERT INTO messages (business_id, from_number, message_body, direction) VALUES ($1, $2, $3, $4)',
      [business.id, fromNumber, messageText, 'inbound']
    );

    // Get recent conversation history for context
    const history = await pool.query(
      `SELECT message_body, direction, bot_response FROM messages 
       WHERE business_id = $1 AND from_number = $2 
       ORDER BY created_at DESC LIMIT 6`,
      [business.id, fromNumber]
    );

    // Generate AI response
    const botResponse = await aiService.generateResponse({
      business,
      userMessage: messageText,
      conversationHistory: history.rows.reverse()
    });

    const responseTime = Date.now() - startTime;

    // Save outbound message record
    await pool.query(
      `INSERT INTO messages (business_id, from_number, message_body, direction, bot_response, response_time_ms) 
       VALUES ($1, $2, $3, 'outbound', $4, $5)`,
      [business.id, fromNumber, botResponse, botResponse, responseTime]
    );

    // Send WhatsApp reply via Twilio
    await twilioService.sendMessage({
      to: From,
      from: To,
      body: botResponse
    });

    // Update daily analytics
    await pool.query(`
      INSERT INTO analytics (business_id, date, total_messages, unique_users, avg_response_ms)
      VALUES ($1, CURRENT_DATE, 1, 1, $2)
      ON CONFLICT (business_id, date)
      DO UPDATE SET 
        total_messages = analytics.total_messages + 1,
        avg_response_ms = (analytics.avg_response_ms + $2) / 2
    `, [business.id, responseTime]);

  } catch (err) {
    console.error('Webhook error:', err);
  }
};

// Get messages for a business
const getMessages = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { page = 1, limit = 50, from_number } = req.query;
    const offset = (page - 1) * limit;

    let query = `SELECT * FROM messages WHERE business_id = $1`;
    const params = [businessId];

    if (from_number) {
      params.push(from_number);
      query += ` AND from_number = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    // Get unique conversation threads
    const threads = await pool.query(
      `SELECT from_number, COUNT(*) as msg_count, MAX(created_at) as last_msg 
       FROM messages WHERE business_id = $1 AND direction = 'inbound'
       GROUP BY from_number ORDER BY last_msg DESC LIMIT 20`,
      [businessId]
    );

    res.json({ messages: result.rows, threads: threads.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Send a manual message from admin
const sendManual = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { to_number, message } = req.body;

    const biz = await pool.query('SELECT * FROM businesses WHERE id = $1', [businessId]);
    if (biz.rows.length === 0) return res.status(404).json({ error: 'Business not found' });

    const business = biz.rows[0];

    await twilioService.sendMessage({
      to: `whatsapp:${to_number}`,
      from: `whatsapp:${business.whatsapp_number}`,
      body: message
    });

    await pool.query(
      `INSERT INTO messages (business_id, from_number, message_body, direction, bot_response) 
       VALUES ($1, $2, $3, 'outbound', $4)`,
      [businessId, to_number, message, message]
    );

    res.json({ message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send: ' + err.message });
  }
};

module.exports = { handleIncoming, getMessages, sendManual };
