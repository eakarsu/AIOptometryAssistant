import express from 'express';
import pool from '../db.js';
import { aiRateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Re-use the same AI helper pattern from ai.js
function parseAIJson(text) {
  try { return JSON.parse(text); } catch {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch {} }
  return null;
}

async function callOpenRouter(systemPrompt, userMsg) {
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:5173',
      'X-Title': 'AI Optometry Assistant',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMsg },
      ],
      temperature: 0.7,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter error: ${response.status} - ${err.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const rawResult = data.choices[0].message.content;
  const result_json = parseAIJson(rawResult);
  return { success: true, result: rawResult, result_json, model: data.model || model };
}

async function persistAI(userId, endpoint, entityId, result, resultJson) {
  try {
    await pool.query(
      `INSERT INTO ai_analyses (user_id, endpoint, entity_id, result, result_json) VALUES ($1,$2,$3,$4,$5)`,
      [userId, endpoint, entityId || null, result, resultJson ? JSON.stringify(resultJson) : null]
    );
  } catch (err) {
    console.error('persistAI error:', err.message);
  }
}

// HIPAA audit log helper
async function auditLog(userId, action, entityType, entityId, ip) {
  try {
    await pool.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address) VALUES ($1,$2,$3,$4,$5)`,
      [userId, action, entityType, entityId, ip]
    );
  } catch (err) { /* non-fatal */ }
}

// POST /api/patients/:id/ai-prescription
// Fetch exam results + history, suggest prescription parameters
router.post('/:id/ai-prescription', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    // Get patient
    const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientRes.rows[0];

    // Get prescription history
    const rxRes = await pool.query(
      `SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY exam_date DESC LIMIT 10`, [id]
    );

    // Get visual acuity history
    const vaRes = await pool.query(
      `SELECT * FROM visual_acuity WHERE patient_id = $1 ORDER BY test_date DESC LIMIT 5`, [id]
    );

    await auditLog(req.user.id, 'ai_prescription_suggestion', 'patient', id, req.ip);

    const age = patient.date_of_birth
      ? Math.floor((new Date() - new Date(patient.date_of_birth)) / 31557600000)
      : 'unknown';

    const rxHistory = rxRes.rows.map((rx, i) => `
Rx ${i + 1} (${rx.exam_date}):
  OD: Sph ${rx.right_sphere}, Cyl ${rx.right_cylinder}, Ax ${rx.right_axis}, Add ${rx.right_add || 'N/A'}
  OS: Sph ${rx.left_sphere}, Cyl ${rx.left_cylinder}, Ax ${rx.left_axis}, Add ${rx.left_add || 'N/A'}
  PD: ${rx.pd || 'N/A'}, Notes: ${rx.notes || 'None'}`).join('\n');

    const vaHistory = vaRes.rows.map(va =>
      `VA (${va.test_date}): OD uncorr ${va.right_uncorrected} corr ${va.right_corrected} | OS uncorr ${va.left_uncorrected} corr ${va.left_corrected}`
    ).join('\n');

    const systemPrompt = `You are an expert optometrist AI assistant. Based on patient history, suggest prescription parameters. Respond with JSON FIRST:
{
  "suggested_od": {"sphere": 0.0, "cylinder": 0.0, "axis": 0, "add": null, "confidence": "low|medium|high"},
  "suggested_os": {"sphere": 0.0, "cylinder": 0.0, "axis": 0, "add": null, "confidence": "low|medium|high"},
  "pd_estimate": null,
  "rationale": "...",
  "progression_trend": "stable|progressive|regressive|fluctuating",
  "clinical_concerns": ["..."],
  "additional_tests_recommended": ["..."],
  "follow_up_interval_months": 12
}
Then provide detailed clinical rationale. IMPORTANT: This is AI-assisted suggestion only. Must be reviewed and confirmed by licensed optometrist.`;

    const userMsg = `Patient: ${patient.first_name} ${patient.last_name}, Age: ${age}
Medical History: ${patient.medical_history || 'None documented'}

Prescription History:
${rxHistory || 'No prior prescriptions'}

Visual Acuity History:
${vaHistory || 'No VA records'}

Current complaint: ${req.body.current_complaint || 'Routine exam'}
Additional notes: ${req.body.notes || 'None'}`;

    const aiResult = await callOpenRouter(systemPrompt, userMsg);
    await persistAI(req.user.id, `/api/patients/${id}/ai-prescription`, parseInt(id), aiResult.result, aiResult.result_json);

    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients/:id/ai-frame-recommend
// Fetch prescription + patient info, return frame and lens recommendations
router.post('/:id/ai-frame-recommend', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientRes.rows[0];

    const rxRes = await pool.query(
      `SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY exam_date DESC LIMIT 1`, [id]
    );
    const latestRx = rxRes.rows[0] || null;

    await auditLog(req.user.id, 'ai_frame_recommendation', 'patient', id, req.ip);

    const { face_shape, lifestyle, budget } = req.body;

    const systemPrompt = `You are an expert optician and eyewear consultant AI. Recommend frames and lenses. Respond with JSON FIRST:
{
  "frame_recommendations": [
    {"style": "...", "shape": "...", "material": "...", "why": "...", "price_range": "..."}
  ],
  "lens_recommendations": {
    "lens_type": "...",
    "coating": ["..."],
    "material": "...",
    "rationale": "..."
  },
  "styles_to_avoid": ["..."],
  "estimated_total_cost": "...",
  "top_pick": "..."
}
Then provide detailed recommendations with styling advice.`;

    const prescription_summary = latestRx
      ? `OD: Sph ${latestRx.right_sphere}, Cyl ${latestRx.right_cylinder}, Ax ${latestRx.right_axis} | OS: Sph ${latestRx.left_sphere}, Cyl ${latestRx.left_cylinder}, Ax ${latestRx.left_axis} | PD: ${latestRx.pd}`
      : 'No current prescription on file';

    const userMsg = `Patient: ${patient.first_name} ${patient.last_name}
Medical History: ${patient.medical_history || 'None'}
Current Prescription: ${prescription_summary}
Face Shape: ${face_shape || 'Not specified'}
Lifestyle: ${lifestyle || 'Not specified'}
Budget: ${budget || 'Not specified'}
Additional preferences: ${req.body.preferences || 'None'}`;

    const aiResult = await callOpenRouter(systemPrompt, userMsg);
    await persistAI(req.user.id, `/api/patients/${id}/ai-frame-recommend`, parseInt(id), aiResult.result, aiResult.result_json);

    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients/:id/insurance-benefits
// Accept insurance plan name, explain benefits, deductibles, coverage limits
router.post('/:id/insurance-benefits', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });

    // Fetch insurance records for this patient
    const insuranceRes = await pool.query(
      `SELECT * FROM insurance_records WHERE patient_id = $1 ORDER BY created_at DESC LIMIT 1`, [id]
    );
    const insuranceRecord = insuranceRes.rows[0] || null;

    const { insurance_plan_name, services_requested } = req.body;
    const planName = insurance_plan_name || insuranceRecord?.provider || 'Unknown Vision Insurance Plan';

    await auditLog(req.user.id, 'ai_insurance_benefits', 'patient', id, req.ip);

    const systemPrompt = `You are an expert vision insurance benefits analyst. Explain insurance coverage in patient-friendly terms. Respond with JSON FIRST:
{
  "plan_type": "...",
  "exam_coverage": {"covered": true|false, "frequency": "...", "copay": "...", "notes": "..."},
  "frames_coverage": {"allowance": "...", "frequency": "...", "notes": "..."},
  "lenses_coverage": {"covered": true|false, "copay": "...", "lens_types": ["..."], "notes": "..."},
  "contact_lens_coverage": {"allowance": "...", "frequency": "...", "notes": "..."},
  "deductible": "...",
  "out_of_pocket_max": "...",
  "in_network_savings": "...",
  "tips_to_maximize": ["..."],
  "typical_patient_cost": "..."
}
Then provide a friendly, plain-language explanation. Always note this is a general estimate and actual benefits should be verified with the insurance carrier.`;

    const userMsg = `Insurance Plan: ${planName}
Plan Details: ${insuranceRecord ? `Policy #${insuranceRecord.policy_number}, Coverage Type: ${insuranceRecord.coverage_type}, Copay: $${insuranceRecord.copay}, Deductible: $${insuranceRecord.deductible}` : 'No records on file'}
Services Requested: ${services_requested || 'Comprehensive eye exam, frames, lenses'}`;

    const aiResult = await callOpenRouter(systemPrompt, userMsg);
    await persistAI(req.user.id, `/api/patients/${id}/insurance-benefits`, parseInt(id), aiResult.result, aiResult.result_json);

    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients/:id/education-content
// Fetch diagnosis + prescription, generate patient-friendly education
router.post('/:id/education-content', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientRes.rows[0];

    const rxRes = await pool.query(
      `SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY exam_date DESC LIMIT 1`, [id]
    );
    const latestRx = rxRes.rows[0] || null;

    await auditLog(req.user.id, 'ai_education_content', 'patient', id, req.ip);

    const { diagnosis, reading_level } = req.body;

    const systemPrompt = `You are a patient education specialist for an optometry practice. Generate clear, compassionate patient education content. Respond with JSON FIRST:
{
  "condition_explained": "...",
  "what_this_means_for_you": "...",
  "care_instructions": ["..."],
  "lifestyle_tips": ["..."],
  "warning_signs_to_watch": ["..."],
  "follow_up_schedule": "...",
  "questions_to_ask_doctor": ["..."],
  "resources": ["..."]
}
Then provide the full patient education document in plain language (reading level: ${reading_level || '8th grade'}).`;

    const age = patient.date_of_birth
      ? Math.floor((new Date() - new Date(patient.date_of_birth)) / 31557600000)
      : 'unknown';

    const rxSummary = latestRx
      ? `OD: Sph ${latestRx.right_sphere}, Cyl ${latestRx.right_cylinder} | OS: Sph ${latestRx.left_sphere}, Cyl ${latestRx.left_cylinder}`
      : 'No current prescription';

    const userMsg = `Patient: ${patient.first_name} ${patient.last_name}, Age: ${age}
Medical History: ${patient.medical_history || 'None'}
Diagnosis: ${diagnosis || req.body.condition || 'Routine refractive error'}
Current Prescription: ${rxSummary}
Additional context: ${req.body.additional_context || 'None'}`;

    const aiResult = await callOpenRouter(systemPrompt, userMsg);
    await persistAI(req.user.id, `/api/patients/${id}/education-content`, parseInt(id), aiResult.result, aiResult.result_json);

    res.json(aiResult);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/patients/:id/schedule-recall
// Fetch history, recommend optimal recall interval, create recall record
router.post('/:id/schedule-recall', aiRateLimiter, async (req, res) => {
  try {
    const { id } = req.params;

    const patientRes = await pool.query('SELECT * FROM patients WHERE id = $1', [id]);
    if (patientRes.rows.length === 0) return res.status(404).json({ error: 'Patient not found' });
    const patient = patientRes.rows[0];

    // Get prescription history
    const rxRes = await pool.query(
      `SELECT * FROM prescriptions WHERE patient_id = $1 ORDER BY exam_date DESC LIMIT 5`, [id]
    );

    // Get retinal scan history
    const scanRes = await pool.query(
      `SELECT * FROM retinal_scans WHERE patient_id = $1 ORDER BY scan_date DESC LIMIT 3`, [id]
    );

    // Get existing recalls
    const recallRes = await pool.query(
      `SELECT * FROM recalls WHERE patient_id = $1 ORDER BY recall_date DESC LIMIT 3`, [id]
    );

    await auditLog(req.user.id, 'ai_schedule_recall', 'patient', id, req.ip);

    const age = patient.date_of_birth
      ? Math.floor((new Date() - new Date(patient.date_of_birth)) / 31557600000)
      : 'unknown';

    const rxSummary = rxRes.rows.map(rx =>
      `${rx.exam_date}: OD Sph ${rx.right_sphere} | OS Sph ${rx.left_sphere}`
    ).join('\n');

    const scanSummary = scanRes.rows.map(sc =>
      `${sc.scan_date}: ${sc.eye} eye, risk ${sc.risk_level}, findings: ${sc.findings || 'none'}`
    ).join('\n');

    const lastRecall = recallRes.rows[0];

    const systemPrompt = `You are an expert optometrist determining optimal patient recall schedules. Based on the patient's history, determine the appropriate recall interval. Respond with JSON FIRST:
{
  "recommended_interval_months": 6,
  "interval_category": "6_months|1_year|2_years",
  "urgency": "urgent|routine|extended",
  "reason": "...",
  "risk_factors": ["..."],
  "recall_type": "...",
  "specific_concerns_to_monitor": ["..."],
  "instructions_for_patient": "..."
}
Then provide clinical reasoning for this recall schedule.`;

    const userMsg = `Patient: ${patient.first_name} ${patient.last_name}, Age: ${age}
Medical History: ${patient.medical_history || 'None'}

Prescription History (last 5):
${rxSummary || 'No prescription history'}

Retinal Scan History (last 3):
${scanSummary || 'No scan history'}

Last recall: ${lastRecall ? `${lastRecall.recall_date} - ${lastRecall.recall_type} (${lastRecall.status})` : 'No prior recalls'}
Additional conditions: ${req.body.conditions || 'None specified'}`;

    const aiResult = await callOpenRouter(systemPrompt, userMsg);
    await persistAI(req.user.id, `/api/patients/${id}/schedule-recall`, parseInt(id), aiResult.result, aiResult.result_json);

    // Optionally auto-create recall record if AI recommends
    let createdRecall = null;
    if (req.body.auto_create && aiResult.result_json) {
      const intervalMonths = aiResult.result_json.recommended_interval_months || 12;
      const recallDate = new Date();
      recallDate.setMonth(recallDate.getMonth() + intervalMonths);

      const recallInsert = await pool.query(
        `INSERT INTO recalls (patient_id, recall_date, recall_type, reason, status, notes)
         VALUES ($1, $2, $3, $4, 'pending', $5) RETURNING *`,
        [
          id,
          recallDate.toISOString().split('T')[0],
          aiResult.result_json.recall_type || 'Comprehensive Eye Exam',
          aiResult.result_json.reason || 'AI-recommended recall',
          `AI-scheduled: ${aiResult.result_json.reason || ''}`
        ]
      );
      createdRecall = recallInsert.rows[0];
    }

    res.json({ ...aiResult, created_recall: createdRecall });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
