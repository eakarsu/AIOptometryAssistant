import express from 'express';
import pool from '../db.js';

const router = express.Router();

// GET / - list all items ordered by category, item_name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY category, item_name');
    res.json(result.rows);
  } catch (err) {
    console.error('Get inventory error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve inventory items' });
  }
});

// GET /:id - get item by id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM inventory WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get inventory item error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve inventory item' });
  }
});

// POST / - create item
router.post('/', async (req, res) => {
  try {
    const { item_name, category, brand, sku, quantity, reorder_level, unit_cost, retail_price, supplier, location, last_restocked } = req.body;
    const result = await pool.query(
      `INSERT INTO inventory (item_name, category, brand, sku, quantity, reorder_level, unit_cost, retail_price, supplier, location, last_restocked)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [item_name, category, brand, sku, quantity, reorder_level, unit_cost, retail_price, supplier, location, last_restocked]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create inventory item error:', err.message);
    res.status(500).json({ error: 'Failed to create inventory item' });
  }
});

// PUT /:id - update item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, category, brand, sku, quantity, reorder_level, unit_cost, retail_price, supplier, location, last_restocked } = req.body;
    const result = await pool.query(
      `UPDATE inventory
       SET item_name = $1, category = $2, brand = $3, sku = $4, quantity = $5,
           reorder_level = $6, unit_cost = $7, retail_price = $8, supplier = $9,
           location = $10, last_restocked = $11
       WHERE id = $12
       RETURNING *`,
      [item_name, category, brand, sku, quantity, reorder_level, unit_cost, retail_price, supplier, location, last_restocked, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update inventory item error:', err.message);
    res.status(500).json({ error: 'Failed to update inventory item' });
  }
});

// DELETE /:id - delete item
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM inventory WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (err) {
    console.error('Delete inventory item error:', err.message);
    res.status(500).json({ error: 'Failed to delete inventory item' });
  }
});

export default router;
