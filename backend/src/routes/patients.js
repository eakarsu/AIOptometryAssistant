import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all patients ordered by last_name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM patients ORDER BY last_name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Get patients error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve patients' });
  }
});

// GET /:id - get patient by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get patient error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve patient' });
  }
});

// POST / - create patient
router.post('/', async (req, res) => {
  try {
    const { first_name, last_name, date_of_birth, email, phone, address, medical_history } = req.body;
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
