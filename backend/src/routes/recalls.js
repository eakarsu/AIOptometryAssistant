import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all recalls with patient name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, p.first_name, p.last_name, p.phone, p.email
       FROM recalls r
       JOIN patients p ON r.patient_id = p.id
       ORDER BY r.recall_date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get recalls error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve recalls' });
  }
});

// GET /overdue - get overdue recalls
router.get('/overdue', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      `SELECT r.*, p.first_name, p.last_name, p.phone, p.email
       FROM recalls r
       JOIN patients p ON r.patient_id = p.id
       WHERE r.recall_date <= $1 AND r.status != 'completed'
       ORDER BY r.recall_date ASC`,
      [today]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get overdue recalls error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve overdue recalls' });
  }
});

// POST / - create recall
router.post('/', async (req, res) => {
  try {
    const { patient_id, recall_date, recall_type, reason, notes } = req.body;
    const result = await pool.query(
      `INSERT INTO recalls (patient_id, recall_date, recall_type, reason, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patient_id, recall_date, recall_type, reason, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create recall error:', err.message);
    res.status(500).json({ error: 'Failed to create recall' });
  }
});

// PUT /:id - update recall
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { patient_id, recall_date, recall_type, reason, status, contact_method, contacted_date, notes } = req.body;
    const result = await pool.query(
      `UPDATE recalls
       SET patient_id = $1, recall_date = $2, recall_type = $3, reason = $4,
           status = $5, contact_method = $6, contacted_date = $7, notes = $8
       WHERE id = $9 RETURNING *`,
      [patient_id, recall_date, recall_type, reason, status, contact_method, contacted_date, notes, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update recall error:', err.message);
    res.status(500).json({ error: 'Failed to update recall' });
  }
});

// DELETE /:id - delete recall
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM recalls WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Recall not found' });
    }
    res.json({ message: 'Recall deleted successfully' });
  } catch (err) {
    console.error('Delete recall error:', err.message);
    res.status(500).json({ error: 'Failed to delete recall' });
  }
});

export default router;
