const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/upload');

const authController = require('../controllers/authController');
const businessController = require('../controllers/businessController');
const fileController = require('../controllers/fileController');
const whatsappController = require('../controllers/whatsappController');
const paymentController = require('../controllers/paymentController');
const aiService = require('../services/aiService');
const pool = require('../models/db');

// ========== AUTH ==========
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.me);
router.put('/auth/password', authenticate, authController.changePassword);

// ========== DASHBOARD ==========
router.get('/dashboard/stats', authenticate, businessController.getStats);

// ========== BUSINESSES ==========
router.get('/businesses', authenticate, businessController.getAll);
router.post('/businesses', authenticate, businessController.create);
router.get('/businesses/:id', authenticate, businessController.getOne);
router.put('/businesses/:id', authenticate, businessController.update);
router.delete('/businesses/:id', authenticate, businessController.remove);
router.post('/businesses/:id/toggle-bot', authenticate, businessController.toggleBot);

// Test bot response
router.post('/businesses/:id/test-bot', authenticate, async (req, res) => {
  try {
    const biz = await pool.query('SELECT * FROM businesses WHERE id = $1', [req.params.id]);
    if (biz.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const response = await aiService.testBot(biz.rows[0], req.body.message || 'Hello, what do you offer?');
    res.json({ response });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== FILES ==========
router.post('/businesses/:businessId/files', authenticate, upload.single('file'), fileController.uploadFile);
router.get('/businesses/:businessId/files', authenticate, fileController.getFiles);
router.delete('/files/:id', authenticate, fileController.deleteFile);

// ========== MESSAGES ==========
router.get('/businesses/:businessId/messages', authenticate, whatsappController.getMessages);
router.post('/businesses/:businessId/messages/send', authenticate, whatsappController.sendManual);

// ========== PAYMENTS ==========
router.get('/payments', authenticate, paymentController.getAll);
router.post('/businesses/:businessId/payments', authenticate, paymentController.recordPayment);
router.get('/payments/analytics', authenticate, paymentController.getAnalytics);

// ========== ANALYTICS ==========
router.get('/analytics', authenticate, async (req, res) => {
  try {
    const overall = await pool.query(`
      SELECT 
        COUNT(DISTINCT business_id) as active_bots,
        SUM(total_messages) as total_messages,
        AVG(avg_response_ms) as avg_response_ms
      FROM analytics 
      WHERE date >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const topBots = await pool.query(`
      SELECT b.name, b.business_type, SUM(a.total_messages) as messages, SUM(a.unique_users) as users
      FROM analytics a
      JOIN businesses b ON b.id = a.business_id
      WHERE a.date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY b.id, b.name, b.business_type
      ORDER BY messages DESC LIMIT 10
    `);

    const daily = await pool.query(`
      SELECT 
        TO_CHAR(date, 'DD Mon') as label,
        SUM(total_messages) as messages
      FROM analytics
      WHERE date >= CURRENT_DATE - INTERVAL '14 days'
      GROUP BY date ORDER BY date
    `);

    res.json({ overall: overall.rows[0], topBots: topBots.rows, daily: daily.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ========== WEBHOOK (public - no auth) ==========
router.post('/webhook/whatsapp', whatsappController.handleIncoming);

module.exports = router;
