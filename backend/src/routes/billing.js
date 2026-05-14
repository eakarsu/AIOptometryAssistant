import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all billing records with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM billing');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT b.*, p.first_name, p.last_name
       FROM billing b
       JOIN patients p ON b.patient_id = p.id
       ORDER BY b.invoice_date DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Get billing records error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve billing records' });
  }
});

// GET /:id - get billing record by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT b.*, p.first_name, p.last_name
       FROM billing b
       JOIN patients p ON b.patient_id = p.id
       WHERE b.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get billing record error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve billing record' });
  }
});

// POST / - create billing record
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, invoice_number, invoice_date, service_description,
      service_code, amount, insurance_covered, patient_responsibility,
      payment_status, payment_method, notes
    } = req.body;

    if (!patient_id || !invoice_number || !amount) {
      return res.status(400).json({ error: 'patient_id, invoice_number, and amount are required' });
    }

    const result = await pool.query(
      `INSERT INTO billing (
        patient_id, invoice_number, invoice_date, service_description,
        service_code, amount, insurance_covered, patient_responsibility,
        payment_status, payment_method, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        patient_id, invoice_number, invoice_date, service_description,
        service_code, amount, insurance_covered, patient_responsibility,
        payment_status, payment_method, notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create billing record error:', err.message);
    res.status(500).json({ error: 'Failed to create billing record' });
  }
});

// PUT /:id - update billing record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id, invoice_number, invoice_date, service_description,
      service_code, amount, insurance_covered, patient_responsibility,
      payment_status, payment_method, notes
    } = req.body;
    const result = await pool.query(
      `UPDATE billing
       SET patient_id = $1, invoice_number = $2, invoice_date = $3, service_description = $4,
           service_code = $5, amount = $6, insurance_covered = $7, patient_responsibility = $8,
           payment_status = $9, payment_method = $10, notes = $11
       WHERE id = $12
       RETURNING *`,
      [
        patient_id, invoice_number, invoice_date, service_description,
        service_code, amount, insurance_covered, patient_responsibility,
        payment_status, payment_method, notes, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update billing record error:', err.message);
    res.status(500).json({ error: 'Failed to update billing record' });
  }
});

// DELETE /:id - delete billing record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM billing WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Billing record not found' });
    }
    res.json({ message: 'Billing record deleted successfully' });
  } catch (err) {
    console.error('Delete billing record error:', err.message);
    res.status(500).json({ error: 'Failed to delete billing record' });
  }
});

export default router;
