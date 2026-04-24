import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all contact lens fittings with patient name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT cl.*, p.first_name, p.last_name
       FROM contact_lenses cl
       JOIN patients p ON cl.patient_id = p.id
       ORDER BY cl.fitting_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get contact lenses error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve contact lens fittings' });
  }
});

// GET /:id - get contact lens fitting by id with patient name
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT cl.*, p.first_name, p.last_name
       FROM contact_lenses cl
       JOIN patients p ON cl.patient_id = p.id
       WHERE cl.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact lens fitting not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get contact lens fitting error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve contact lens fitting' });
  }
});

// POST / - create contact lens fitting
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, fitting_date, lens_brand, lens_type,
      right_base_curve, right_diameter, right_power, right_cylinder, right_axis,
      left_base_curve, left_diameter, left_power, left_cylinder, left_axis,
      wear_schedule, replacement_schedule, solution_recommended, notes
    } = req.body;
    const result = await pool.query(
      `INSERT INTO contact_lenses (
        patient_id, fitting_date, lens_brand, lens_type,
        right_base_curve, right_diameter, right_power, right_cylinder, right_axis,
        left_base_curve, left_diameter, left_power, left_cylinder, left_axis,
        wear_schedule, replacement_schedule, solution_recommended, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
       RETURNING *`,
      [
        patient_id, fitting_date, lens_brand, lens_type,
        right_base_curve, right_diameter, right_power, right_cylinder, right_axis,
        left_base_curve, left_diameter, left_power, left_cylinder, left_axis,
        wear_schedule, replacement_schedule, solution_recommended, notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create contact lens fitting error:', err.message);
    res.status(500).json({ error: 'Failed to create contact lens fitting' });
  }
});

// PUT /:id - update contact lens fitting
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id, fitting_date, lens_brand, lens_type,
      right_base_curve, right_diameter, right_power, right_cylinder, right_axis,
      left_base_curve, left_diameter, left_power, left_cylinder, left_axis,
      wear_schedule, replacement_schedule, solution_recommended, notes
    } = req.body;
    const result = await pool.query(
      `UPDATE contact_lenses
       SET patient_id = $1, fitting_date = $2, lens_brand = $3, lens_type = $4,
           right_base_curve = $5, right_diameter = $6, right_power = $7, right_cylinder = $8, right_axis = $9,
           left_base_curve = $10, left_diameter = $11, left_power = $12, left_cylinder = $13, left_axis = $14,
           wear_schedule = $15, replacement_schedule = $16, solution_recommended = $17, notes = $18
       WHERE id = $19
       RETURNING *`,
      [
        patient_id, fitting_date, lens_brand, lens_type,
        right_base_curve, right_diameter, right_power, right_cylinder, right_axis,
        left_base_curve, left_diameter, left_power, left_cylinder, left_axis,
        wear_schedule, replacement_schedule, solution_recommended, notes, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact lens fitting not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update contact lens fitting error:', err.message);
    res.status(500).json({ error: 'Failed to update contact lens fitting' });
  }
});

// DELETE /:id - delete contact lens fitting
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM contact_lenses WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Contact lens fitting not found' });
    }
    res.json({ message: 'Contact lens fitting deleted successfully' });
  } catch (err) {
    console.error('Delete contact lens fitting error:', err.message);
    res.status(500).json({ error: 'Failed to delete contact lens fitting' });
  }
});

export default router;
