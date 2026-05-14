import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all prescriptions with patient name (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM prescriptions');
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT pr.*, p.first_name, p.last_name
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       ORDER BY pr.exam_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get prescriptions error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve prescriptions' });
  }
});

// GET /patient/:patientId - get prescriptions for a specific patient
router.get('/patient/:patientId', async (req, res) => {
  try {
    const { patientId } = req.params;
    const result = await pool.query(
      `SELECT pr.*, p.first_name, p.last_name
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       WHERE pr.patient_id = $1
       ORDER BY pr.exam_date DESC`,
      [patientId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get patient prescriptions error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve patient prescriptions' });
  }
});

// GET /:id - get prescription by id with patient name
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT pr.*, p.first_name, p.last_name
       FROM prescriptions pr
       JOIN patients p ON pr.patient_id = p.id
       WHERE pr.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get prescription error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve prescription' });
  }
});

// POST / - create prescription
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, exam_date,
      right_sphere, right_cylinder, right_axis, right_add,
      left_sphere, left_cylinder, left_axis, left_add,
      pd, notes, ai_trend_analysis
    } = req.body;
    const result = await pool.query(
      `INSERT INTO prescriptions (
        patient_id, exam_date,
        right_sphere, right_cylinder, right_axis, right_add,
        left_sphere, left_cylinder, left_axis, left_add,
        pd, notes, ai_trend_analysis
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        patient_id, exam_date,
        right_sphere, right_cylinder, right_axis, right_add,
        left_sphere, left_cylinder, left_axis, left_add,
        pd, notes, ai_trend_analysis
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create prescription error:', err.message);
    res.status(500).json({ error: 'Failed to create prescription' });
  }
});

// PUT /:id - update prescription
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id, exam_date,
      right_sphere, right_cylinder, right_axis, right_add,
      left_sphere, left_cylinder, left_axis, left_add,
      pd, notes, ai_trend_analysis
    } = req.body;
    const result = await pool.query(
      `UPDATE prescriptions
       SET patient_id = $1, exam_date = $2,
           right_sphere = $3, right_cylinder = $4, right_axis = $5, right_add = $6,
           left_sphere = $7, left_cylinder = $8, left_axis = $9, left_add = $10,
           pd = $11, notes = $12, ai_trend_analysis = $13
       WHERE id = $14
       RETURNING *`,
      [
        patient_id, exam_date,
        right_sphere, right_cylinder, right_axis, right_add,
        left_sphere, left_cylinder, left_axis, left_add,
        pd, notes, ai_trend_analysis, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update prescription error:', err.message);
    res.status(500).json({ error: 'Failed to update prescription' });
  }
});

// DELETE /:id - delete prescription
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM prescriptions WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    res.json({ message: 'Prescription deleted successfully' });
  } catch (err) {
    console.error('Delete prescription error:', err.message);
    res.status(500).json({ error: 'Failed to delete prescription' });
  }
});

export default router;
