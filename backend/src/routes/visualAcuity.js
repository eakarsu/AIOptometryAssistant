import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all visual acuity tests with patient name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT va.*, p.first_name, p.last_name
       FROM visual_acuity va
       JOIN patients p ON va.patient_id = p.id
       ORDER BY va.test_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get visual acuity tests error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve visual acuity tests' });
  }
});

// GET /:id - get visual acuity test by id with patient name
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT va.*, p.first_name, p.last_name
       FROM visual_acuity va
       JOIN patients p ON va.patient_id = p.id
       WHERE va.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visual acuity test not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get visual acuity test error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve visual acuity test' });
  }
});

// POST / - create visual acuity test
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, test_date,
      right_uncorrected, right_corrected, left_uncorrected, left_corrected,
      both_uncorrected, both_corrected,
      test_type, test_distance, pinhole_right, pinhole_left, notes
    } = req.body;
    const result = await pool.query(
      `INSERT INTO visual_acuity (
        patient_id, test_date,
        right_uncorrected, right_corrected, left_uncorrected, left_corrected,
        both_uncorrected, both_corrected,
        test_type, test_distance, pinhole_right, pinhole_left, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        patient_id, test_date,
        right_uncorrected, right_corrected, left_uncorrected, left_corrected,
        both_uncorrected, both_corrected,
        test_type, test_distance, pinhole_right, pinhole_left, notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create visual acuity test error:', err.message);
    res.status(500).json({ error: 'Failed to create visual acuity test' });
  }
});

// PUT /:id - update visual acuity test
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id, test_date,
      right_uncorrected, right_corrected, left_uncorrected, left_corrected,
      both_uncorrected, both_corrected,
      test_type, test_distance, pinhole_right, pinhole_left, notes
    } = req.body;
    const result = await pool.query(
      `UPDATE visual_acuity
       SET patient_id = $1, test_date = $2,
           right_uncorrected = $3, right_corrected = $4, left_uncorrected = $5, left_corrected = $6,
           both_uncorrected = $7, both_corrected = $8,
           test_type = $9, test_distance = $10, pinhole_right = $11, pinhole_left = $12, notes = $13
       WHERE id = $14
       RETURNING *`,
      [
        patient_id, test_date,
        right_uncorrected, right_corrected, left_uncorrected, left_corrected,
        both_uncorrected, both_corrected,
        test_type, test_distance, pinhole_right, pinhole_left, notes, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visual acuity test not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update visual acuity test error:', err.message);
    res.status(500).json({ error: 'Failed to update visual acuity test' });
  }
});

// DELETE /:id - delete visual acuity test
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM visual_acuity WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visual acuity test not found' });
    }
    res.json({ message: 'Visual acuity test deleted successfully' });
  } catch (err) {
    console.error('Delete visual acuity test error:', err.message);
    res.status(500).json({ error: 'Failed to delete visual acuity test' });
  }
});

export default router;
