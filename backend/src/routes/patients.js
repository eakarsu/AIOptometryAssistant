import express from 'express';
import pool from '../db.js';
import { patientValidation } from '../middleware/validate.js';

const router = express.Router();

// GET / - list all patients with pagination
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM patients');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query('SELECT * FROM patients ORDER BY last_name ASC LIMIT $1 OFFSET $2', [limit, offset]);
    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Get patients error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
});

// GET /:id - get patient by id (HIPAA audit log)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    // HIPAA audit log
    try {
      await pool.query(
        `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1, $2, $3, $4, $5)`,
        [req.user?.id || null, 'view_patient', 'patient', id, req.ip]
      );
    } catch (auditErr) {
      console.error('Audit log error (non-fatal):', auditErr.message);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get patient error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

// POST / - create patient
router.post('/', patientValidation, async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, email, phone, address, medical_history } = req.body;
    if (!first_name || !last_name) {
      return res.status(400).json({ error: 'first_name and last_name are required' });
    }
    const result = await pool.query(
      `INSERT INTO patients (first_name, last_name, date_of_birth, email, phone, address, medical_history)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [first_name, last_name, date_of_birth, email, phone, address, medical_history]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create patient error:', err.message);
    res.status(500).json({ error: 'Failed to create patient' });
  }
});

// PUT /:id - update patient
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, date_of_birth, email, phone, address, medical_history } = req.body;
    const result = await pool.query(
      `UPDATE patients
       SET first_name = $1, last_name = $2, date_of_birth = $3, email = $4,
           phone = $5, address = $6, medical_history = $7
       WHERE id = $8
       RETURNING *`,
      [first_name, last_name, date_of_birth, email, phone, address, medical_history, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update patient error:', err.message);
    res.status(500).json({ error: 'Failed to update patient' });
  }
});

// DELETE /:id - delete patient
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM patients WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ message: 'Patient deleted successfully' });
  } catch (err) {
    console.error('Delete patient error:', err.message);
    res.status(500).json({ error: 'Failed to delete patient' });
  }
});

export default router;
