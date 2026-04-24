import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all frames
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM frames ORDER BY brand, model');
    res.json(result.rows);
  } catch (err) {
    console.error('Get frames error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve frames' });
  }
});

// GET /:id - get frame by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM frames WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get frame error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve frame' });
  }
});

// POST / - create frame
router.post('/', async (req, res) => {
  try {
    const { brand, model, color, material, shape, size, price, image_url, suitable_face_shapes, gender, in_stock } = req.body;
    const result = await pool.query(
      `INSERT INTO frames (brand, model, color, material, shape, size, price, image_url, suitable_face_shapes, gender, in_stock)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [brand, model, color, material, shape, size, price, image_url, suitable_face_shapes, gender, in_stock]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create frame error:', err.message);
    res.status(500).json({ error: 'Failed to create frame' });
  }
});

// PUT /:id - update frame
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { brand, model, color, material, shape, size, price, image_url, suitable_face_shapes, gender, in_stock } = req.body;
    const result = await pool.query(
      `UPDATE frames
       SET brand = $1, model = $2, color = $3, material = $4, shape = $5,
           size = $6, price = $7, image_url = $8, suitable_face_shapes = $9,
           gender = $10, in_stock = $11
       WHERE id = $12
       RETURNING *`,
      [brand, model, color, material, shape, size, price, image_url, suitable_face_shapes, gender, in_stock, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update frame error:', err.message);
    res.status(500).json({ error: 'Failed to update frame' });
  }
});

// DELETE /:id - delete frame
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM frames WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Frame not found' });
    }
    res.json({ message: 'Frame deleted successfully' });
  } catch (err) {
    console.error('Delete frame error:', err.message);
    res.status(500).json({ error: 'Failed to delete frame' });
  }
});

export default router;
