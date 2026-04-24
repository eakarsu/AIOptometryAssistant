import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all appointments with patient name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, p.first_name, p.last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       ORDER BY a.appointment_date DESC, a.appointment_time`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get appointments error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve appointments' });
  }
});

// GET /:id - get appointment by id with patient name
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT a.*, p.first_name, p.last_name
       FROM appointments a
       JOIN patients p ON a.patient_id = p.id
       WHERE a.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get appointment error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve appointment' });
  }
});

// POST / - create appointment
router.post('/', async (req, res) => {
  try {
    const {
      patient_id, doctor_name, appointment_date, appointment_time,
      duration_minutes, appointment_type, status, room, notes
    } = req.body;
    const result = await pool.query(
      `INSERT INTO appointments (
        patient_id, doctor_name, appointment_date, appointment_time,
        duration_minutes, appointment_type, status, room, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        patient_id, doctor_name, appointment_date, appointment_time,
        duration_minutes, appointment_type, status, room, notes
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create appointment error:', err.message);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// PUT /:id - update appointment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      patient_id, doctor_name, appointment_date, appointment_time,
      duration_minutes, appointment_type, status, room, notes
    } = req.body;
    const result = await pool.query(
      `UPDATE appointments
       SET patient_id = $1, doctor_name = $2, appointment_date = $3, appointment_time = $4,
           duration_minutes = $5, appointment_type = $6, status = $7, room = $8, notes = $9
       WHERE id = $10
       RETURNING *`,
      [
        patient_id, doctor_name, appointment_date, appointment_time,
        duration_minutes, appointment_type, status, room, notes, id
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update appointment error:', err.message);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// DELETE /:id - delete appointment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM appointments WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    res.json({ message: 'Appointment deleted successfully' });
  } catch (err) {
    console.error('Delete appointment error:', err.message);
    res.status(500).json({ error: 'Failed to delete appointment' });
  }
});

export default router;
