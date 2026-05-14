import express from 'express';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const uploadsDir = join(__dirname, '../../../uploads/retinal-scans');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop();
    cb(null, `scan-${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`);
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/tiff', 'image/bmp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files allowed'), false);
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// parseAIJson helper
function parseAIJson(text) {
  try { return JSON.parse(text); } catch {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch {} }
  return null;
}

const router = express.Router();

// GET / - list all scans with patient name (paginated)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countRes = await pool.query('SELECT COUNT(*) FROM retinal_scans');
    const total = parseInt(countRes.rows[0].count);

    const result = await pool.query(
      `SELECT rs.*, p.first_name, p.last_name
       FROM retinal_scans rs
       JOIN patients p ON rs.patient_id = p.id
       ORDER BY rs.scan_date DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.json({ data: result.rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('Get retinal scans error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve retinal scans' });
  }
});

// GET /:id - get scan by id
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
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });
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

// POST /:id/upload - upload retinal scan image
router.post('/:id/upload', upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image file provided' });

    const imageUrl = `/uploads/retinal-scans/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE retinal_scans SET image_url = $1 WHERE id = $2 RETURNING *',
      [imageUrl, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Retinal scan not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Upload retinal scan error:', err.message);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

// POST /:id/analyze-image - vision AI analysis of uploaded image
router.post('/:id/analyze-image', async (req, res) => {
  try {
    const { id } = req.params;
    const scanResult = await pool.query('SELECT * FROM retinal_scans WHERE id = $1', [id]);
    if (scanResult.rows.length === 0) return res.status(404).json({ error: 'Retinal scan not found' });

    const scan = scanResult.rows[0];
    if (!scan.image_url) return res.status(400).json({ error: 'No image uploaded for this scan' });

    // Read image file as base64
    const imagePath = join(__dirname, '../../../', scan.image_url);
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file not found on disk' });
    }
    const imageData = fs.readFileSync(imagePath);
    const b64 = imageData.toString('base64');
    const mimeType = 'image/jpeg';

    // Call vision AI
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
        'X-Title': 'AI Optometry Assistant'
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: { url: `data:${mimeType};base64,${b64}` }
              },
              {
                type: 'text',
                text: 'Analyze this retinal fundus photo. Identify: diabetic retinopathy signs, macular degeneration indicators, optic nerve appearance, vessel caliber. Return JSON: {"findings": [], "dr_risk": "none|mild|moderate|severe|proliferative", "amd_risk": "none|early|intermediate|advanced", "glaucoma_risk": "none|suspect|likely", "confidence": 0.0, "recommendation": ""}'
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(`Vision AI error: ${response.status} - ${errData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const rawResult = data.choices[0].message.content;
    const parsedJson = parseAIJson(rawResult);

    // Store in ai_analyses
    await pool.query(
      `INSERT INTO ai_analyses (user_id, endpoint, entity_id, result, result_json) VALUES ($1, $2, $3, $4, $5)`,
      [req.user?.id || null, '/api/retinal-scans/:id/analyze-image', id, rawResult, parsedJson ? JSON.stringify(parsedJson) : null]
    );

    // Update retinal scan ai_analysis
    await pool.query(
      'UPDATE retinal_scans SET ai_analysis = $1 WHERE id = $2',
      [rawResult, id]
    );

    res.json({ success: true, result: rawResult, result_json: parsedJson });
  } catch (err) {
    console.error('Analyze image error:', err.message);
    res.status(500).json({ error: 'Failed to analyze retinal image: ' + err.message });
  }
});

export default router;
