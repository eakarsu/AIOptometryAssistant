import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all scans with patient name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT rs.*, p.first_name, p.last_name
       FROM retinal_scans rs
       JOIN patients p ON rs.patient_id = p.id
       ORDER BY rs.scan_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get retinal scans error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve retinal scans' });
  }
});

// GET /:id - get scan by id with patient name
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT rs.*, p.first_name, p.last_name
       FROM retinal_scans rs
       JOIN patients p ON rs.patient_id = p.id
       WHERE rs.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Retinal scan not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get retinal scan error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve retinal scan' });
  }
});

// POST / - create scan
router.post('/', async (req, res) => {
  try {
    const { patient_id, scan_date, eye, image_url, ai_analysis, findings, risk_level, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO retinal_scans (patient_id, scan_date, eye, image_url, ai_analysis, findings, risk_level, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [patient_id, scan_date, eye, image_url, ai_analysis, findings, risk_level, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create retinal scan error:', err.message);
    res.status(500).json({ error: 'Failed to create retinal scan' });
  }
});

// PUT /:id - update scan
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { patient_id, scan_date, eye, image_url, ai_analysis, findings, risk_level, notes } = req.body;
    const result = await pool.query(
      `UPDATE retinal_scans
       SET patient_id = $1, scan_date = $2, eye = $3, image_url = $4,
           ai_analysis = $5, findings = $6, risk_level = $7, notes = $8
       WHERE id = $9
       RETURNING *`,
      [patient_id, scan_date, eye, image_url, ai_analysis, findings, risk_level, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Retinal scan not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update retinal scan error:', err.message);
    res.status(500).json({ error: 'Failed to update retinal scan' });
  }
});

// DELETE /:id - delete scan
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM retinal_scans WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Retinal scan not found' });
    }
    res.json({ message: 'Retinal scan deleted successfully' });
  } catch (err) {
    console.error('Delete retinal scan error:', err.message);
    res.status(500).json({ error: 'Failed to delete retinal scan' });
  }
});

export default router;
