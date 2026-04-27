const pool = require('../models/db');

const getAll = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, b.name as business_name, b.whatsapp_number
      FROM payments p
      JOIN businesses b ON b.id = p.business_id
      ORDER BY p.created_at DESC
    `);
    res.json({ payments: result.rows });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const recordPayment = async (req, res) => {
  try {
    const { businessId } = req.params;
    const { amount, payment_method, notes } = req.body;

    const result = await pool.query(`
      INSERT INTO payments (business_id, amount, status, payment_method, notes, paid_at)
      VALUES ($1, $2, 'paid', $3, $4, NOW())
      RETURNING *
    `, [businessId, amount || 50, payment_method || 'cash', notes]);

    // Mark business as paid and extend due date
    await pool.query(`
      UPDATE businesses SET 
        is_paid = true, 
        payment_due_date = NOW() + INTERVAL '1 month',
        updated_at = NOW()
      WHERE id = $1
    `, [businessId]);

    res.json({ payment: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

const getAnalytics = async (req, res) => {
  try {
    const summary = await pool.query(`
      SELECT
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as total_collected,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_count,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as outstanding
      FROM payments
    `);

    const unpaidBusinesses = await pool.query(`
      SELECT id, name, whatsapp_number, monthly_fee, payment_due_date
      FROM businesses
      WHERE is_paid = false AND status = 'active'
      ORDER BY payment_due_date ASC
    `);

    const monthlyRevenue = await pool.query(`
      SELECT 
        TO_CHAR(date_trunc('month', paid_at), 'YYYY-MM') as month,
        TO_CHAR(date_trunc('month', paid_at), 'Mon YYYY') as label,
        SUM(amount) as revenue,
        COUNT(*) as payments
      FROM payments
      WHERE status = 'paid' AND paid_at > NOW() - INTERVAL '6 months'
      GROUP BY date_trunc('month', paid_at)
      ORDER BY date_trunc('month', paid_at)
    `);

    res.json({
      summary: summary.rows[0],
      unpaidBusinesses: unpaidBusinesses.rows,
      monthlyRevenue: monthlyRevenue.rows
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
};

module.exports = { getAll, recordPayment, getAnalytics };
