import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET /dashboard - aggregated dashboard stats
router.get('/dashboard', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const firstOfMonth = today.slice(0, 8) + '01';

    const [
      todayAppts,
      monthRevenue,
      lowStock,
      totalPatients,
      monthNewPatients,
      pendingBills,
      recentAppointments,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) as count FROM appointments WHERE appointment_date = $1 AND status != 'cancelled'`,
        [today]
      ),
      pool.query(
        `SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM billing WHERE invoice_date >= $1 AND payment_status = 'paid'`,
        [firstOfMonth]
      ),
      pool.query(
        `SELECT COUNT(*) as count FROM inventory WHERE quantity <= reorder_level`
      ),
      pool.query(`SELECT COUNT(*) as count FROM patients`),
      pool.query(
        `SELECT COUNT(*) as count FROM patients WHERE created_at >= $1`,
        [firstOfMonth]
      ),
      pool.query(
        `SELECT COALESCE(SUM(patient_responsibility), 0) as total, COUNT(*) as count
         FROM billing WHERE payment_status IN ('pending', 'overdue')`
      ),
      pool.query(
        `SELECT a.*, p.first_name, p.last_name
         FROM appointments a
         JOIN patients p ON a.patient_id = p.id
         WHERE a.appointment_date = $1
         ORDER BY a.appointment_time`,
        [today]
      ),
    ]);

    res.json({
      today_appointments: parseInt(todayAppts.rows[0].count),
      month_revenue: parseFloat(monthRevenue.rows[0].total),
      month_invoices_paid: parseInt(monthRevenue.rows[0].count),
      low_stock_items: parseInt(lowStock.rows[0].count),
      total_patients: parseInt(totalPatients.rows[0].count),
      new_patients_this_month: parseInt(monthNewPatients.rows[0].count),
      pending_balance: parseFloat(pendingBills.rows[0].total),
      pending_invoices: parseInt(pendingBills.rows[0].count),
      today_schedule: recentAppointments.rows,
    });
  } catch (err) {
    console.error('Dashboard stats error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve dashboard stats' });
  }
});

// GET /revenue - monthly revenue breakdown
router.get('/revenue', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(invoice_date, 'YYYY-MM') as month,
        COALESCE(SUM(amount), 0) as total_billed,
        COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN amount ELSE 0 END), 0) as total_collected,
        COALESCE(SUM(insurance_covered), 0) as insurance_total,
        COALESCE(SUM(patient_responsibility), 0) as patient_total,
        COUNT(*) as invoice_count
      FROM billing
      WHERE invoice_date >= NOW() - INTERVAL '12 months'
      GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
      ORDER BY month
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Revenue report error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve revenue report' });
  }
});

// GET /appointments-stats - appointment statistics
router.get('/appointments-stats', async (req, res) => {
  try {
    const [byType, byStatus, byMonth] = await Promise.all([
      pool.query(`
        SELECT appointment_type, COUNT(*) as count
        FROM appointments
        GROUP BY appointment_type
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT status, COUNT(*) as count
        FROM appointments
        GROUP BY status
        ORDER BY count DESC
      `),
      pool.query(`
        SELECT
          TO_CHAR(appointment_date, 'YYYY-MM') as month,
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
          COUNT(CASE WHEN status = 'no-show' THEN 1 END) as no_show
        FROM appointments
        WHERE appointment_date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(appointment_date, 'YYYY-MM')
        ORDER BY month
      `),
    ]);

    res.json({
      by_type: byType.rows,
      by_status: byStatus.rows,
      by_month: byMonth.rows,
    });
  } catch (err) {
    console.error('Appointment stats error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve appointment stats' });
  }
});

// GET /patient-demographics - patient age and visit statistics
router.get('/patient-demographics', async (req, res) => {
  try {
    const [ageGroups, topPatients] = await Promise.all([
      pool.query(`
        SELECT
          CASE
            WHEN EXTRACT(YEAR FROM AGE(NOW(), date_of_birth)) < 18 THEN 'Under 18'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), date_of_birth)) BETWEEN 18 AND 30 THEN '18-30'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), date_of_birth)) BETWEEN 31 AND 45 THEN '31-45'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), date_of_birth)) BETWEEN 46 AND 60 THEN '46-60'
            WHEN EXTRACT(YEAR FROM AGE(NOW(), date_of_birth)) > 60 THEN 'Over 60'
            ELSE 'Unknown'
          END as age_group,
          COUNT(*) as count
        FROM patients
        WHERE date_of_birth IS NOT NULL
        GROUP BY age_group
        ORDER BY
          CASE age_group
            WHEN 'Under 18' THEN 1
            WHEN '18-30' THEN 2
            WHEN '31-45' THEN 3
            WHEN '46-60' THEN 4
            WHEN 'Over 60' THEN 5
            ELSE 6
          END
      `),
      pool.query(`
        SELECT p.id, p.first_name, p.last_name,
          COUNT(DISTINCT a.id) as appointment_count,
          COUNT(DISTINCT pr.id) as prescription_count,
          MAX(a.appointment_date) as last_visit
        FROM patients p
        LEFT JOIN appointments a ON p.id = a.patient_id
        LEFT JOIN prescriptions pr ON p.id = pr.patient_id
        GROUP BY p.id, p.first_name, p.last_name
        ORDER BY appointment_count DESC
        LIMIT 10
      `),
    ]);

    res.json({
      age_groups: ageGroups.rows,
      top_patients: topPatients.rows,
    });
  } catch (err) {
    console.error('Patient demographics error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve patient demographics' });
  }
});

// GET /inventory-alerts - low stock and expiring items
router.get('/inventory-alerts', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory
      WHERE quantity <= reorder_level
      ORDER BY (quantity::float / NULLIF(reorder_level, 0)) ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Inventory alerts error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve inventory alerts' });
  }
});

export default router;
