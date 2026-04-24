import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all records with patient name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.*, p.first_name, p.last_name
       FROM insurance_records i
       JOIN patients p ON i.patient_id = p.id
       ORDER BY p.last_name ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get insurance records error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve insurance records' });
  }
});

// GET /:id - get record by id with patient name
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT i.*, p.first_name, p.last_name
       FROM insurance_records i
       JOIN patients p ON i.patient_id = p.id
       WHERE i.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get insurance record error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve insurance record' });
  }
});

// POST / - create record
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, provider, policy_number, group_number,
      subscriber_name, coverage_type, effective_date, expiration_date,
      copay, deductible, verification_status, verification_result
    } = req.body;
    const result = await pool.query(
      `INSERT INTO insurance_records (
        patient_id, provider, policy_number, group_number,
        subscriber_name, coverage_type, effective_date, expiration_date,
        copay, deductible, verification_status, verification_result
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        patient_id, provider, policy_number, group_number,
        subscriber_name, coverage_type, effective_date, expiration_date,
        copay, deductible, verification_status, verification_result
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create insurance record error:', err.message);
    res.status(500).json({ error: 'Failed to create insurance record' });
  }
});

// PUT /:id - update record
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id, provider, policy_number, group_number,
      subscriber_name, coverage_type, effective_date, expiration_date,
      copay, deductible, verification_status, verification_result
    } = req.body;
    const result = await pool.query(
      `UPDATE insurance_records
       SET patient_id = $1, provider = $2, policy_number = $3, group_number = $4,
           subscriber_name = $5, coverage_type = $6, effective_date = $7, expiration_date = $8,
           copay = $9, deductible = $10, verification_status = $11, verification_result = $12
       WHERE id = $13
       RETURNING *`,
      [
        patient_id, provider, policy_number, group_number,
        subscriber_name, coverage_type, effective_date, expiration_date,
        copay, deductible, verification_status, verification_result, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance record not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update insurance record error:', err.message);
    res.status(500).json({ error: 'Failed to update insurance record' });
  }
});

// DELETE /:id - delete record
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM insurance_records WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Insurance record not found' });
    }
    res.json({ message: 'Insurance record deleted successfully' });
  } catch (err) {
    console.error('Delete insurance record error:', err.message);
    res.status(500).json({ error: 'Failed to delete insurance record' });
  }
});

export default router;
