import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import pool from '../db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

const router = express.Router();

// Rate limiter: 20 AI calls per hour per user
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user ? `user_${req.user.id}` : ipKeyGenerator(req.ip),
  message: { error: 'Too many AI requests. Limit is 20 per hour.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 3-strategy JSON parser
function parseAIJson(text) {
  try { return JSON.parse(text); } catch {}
  const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlock) { try { return JSON.parse(codeBlock[1].trim()); } catch {} }
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) { try { return JSON.parse(jsonMatch[0]); } catch {} }
  return null;
}

async function callOpenRouter(prompt, useJson = false) {
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022';
  const apiKey = process.env.OPENROUTER_API_KEY;
  const openRouterUrl = `${(process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1').replace(/\/$/, '')}/chat/completions`;
  if (!apiKey) throw new Error('OPENROUTER_API_KEY is not configured');
  const response = await fetch(openRouterUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Optometry Assistant'
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI optometry assistant. Provide professional, accurate, and detailed responses related to optometry, ophthalmology, and vision care. Always note that your analysis is AI-assisted and should be reviewed by a licensed optometrist or ophthalmologist.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('OpenRouter returned no message content');
  return content;
}

// Helper to persist AI result
async function persistAnalysis(userId, endpoint, entityId, result) {
  try {
    const parsedJson = parseAIJson(result);
    await pool.query(
      `INSERT INTO ai_analyses (user_id, endpoint, entity_id, result, result_json) VALUES ($1, $2, $3, $4, $5)`,
      [userId, endpoint, entityId || null, result, parsedJson ? JSON.stringify(parsedJson) : null]
    );
    return parsedJson;
  } catch (err) {
    console.error('Persist AI analysis error:', err.message);
    return null;
  }
}

// GET /history - paginated AI analysis history for current user
router.get('/history', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const countResult = await pool.query('SELECT COUNT(*) FROM ai_analyses WHERE user_id = $1', [req.user.id]);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT * FROM ai_analyses WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({
      data: result.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    });
  } catch (err) {
    console.error('Get AI history error:', err.message);
    res.status(500).json({ error: 'Failed to retrieve AI history' });
  }
});

// POST /analyze-retinal-scan
router.post('/analyze-retinal-scan', aiRateLimiter, async (req, res) => {
  try {
    const { findings, risk_level, patient_age, eye, scan_id } = req.body;

    const jsonInstruction = `First, respond with a JSON block:
{"dr_risk":"none|mild|moderate|severe|proliferative","amd_risk":"none|early|intermediate|advanced","glaucoma_risk":"none|suspect|likely","confidence":0.0,"key_findings":[]}
Then provide detailed analysis:`;

    const prompt = `${jsonInstruction}

As an expert optometry AI assistant, analyze the following retinal scan data.

Eye: ${eye || 'Not specified'}
Patient Age: ${patient_age || 'Not provided'}
Findings: ${findings}
Risk Level: ${risk_level || 'Not assessed'}

Provide: 1) Diagnosis Suggestions, 2) Risk Assessment, 3) Findings Interpretation, 4) Recommended Follow-ups, 5) Treatment Considerations, 6) Patient Education Points.

Note: AI-assisted analysis; must be reviewed by a licensed eye care professional.`;

    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/analyze-retinal-scan', scan_id, analysis);

    // If scan_id provided, update retinal_scans table
    if (scan_id) {
      try {
        await pool.query('UPDATE retinal_scans SET ai_analysis = $1 WHERE id = $2', [analysis, scan_id]);
      } catch (e) { /* non-fatal */ }
    }

    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Analyze retinal scan error:', err.message);
    res.status(500).json({ error: 'Failed to analyze retinal scan' });
  }
});

// POST /prescription-trends
router.post('/prescription-trends', aiRateLimiter, async (req, res) => {
  try {
    const { prescriptions, patient_name, patient_age, patient_id } = req.body;

    if (!prescriptions || !Array.isArray(prescriptions) || prescriptions.length === 0) {
      return res.status(400).json({ error: 'prescriptions array is required' });
    }

    const prescriptionSummary = prescriptions.map((rx, i) => `
Prescription ${i + 1} (Date: ${rx.exam_date}):
  OD: Sphere ${rx.right_sphere}, Cylinder ${rx.right_cylinder}, Axis ${rx.right_axis}, Add ${rx.right_add || 'N/A'}
  OS: Sphere ${rx.left_sphere}, Cylinder ${rx.left_cylinder}, Axis ${rx.left_axis}, Add ${rx.left_add || 'N/A'}
  PD: ${rx.pd || 'N/A'}
  Notes: ${rx.notes || 'None'}`).join('\n');

    const jsonInstruction = `First, provide a JSON summary:
{"progression_rate_od_diopters_per_year":0,"progression_rate_os_diopters_per_year":0,"trend":"stable|progressive|regressive|fluctuating","primary_concern":"","predicted_next_rx_od_sphere":0,"predicted_next_rx_os_sphere":0}
Then detailed analysis:`;

    const prompt = `${jsonInstruction}

Patient: ${patient_name || 'Not provided'}, Age: ${patient_age || 'Not provided'}

Prescription History:
${prescriptionSummary}

Provide: 1) Myopia/Hyperopia Progression, 2) Astigmatism Changes, 3) Presbyopia Assessment, 4) Rate of Change, 5) Anisometropia, 6) Future Predictions, 7) Clinical Concerns, 8) Recommendations.

Note: AI-assisted; verify with licensed professional.`;

    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/prescription-trends', patient_id, analysis);

    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Prescription trends error:', err.message);
    res.status(500).json({ error: 'Failed to analyze prescription trends' });
  }
});

// POST /frame-recommendation
router.post('/frame-recommendation', aiRateLimiter, async (req, res) => {
  try {
    const { face_shape, preferences, budget, prescription_type, skin_tone, lifestyle } = req.body;
    if (!face_shape || !budget) return res.status(400).json({ error: 'face_shape and budget are required' });

    const prompt = `As an expert optometry and eyewear AI assistant, recommend frames based on:
Face Shape: ${face_shape}, Skin Tone: ${skin_tone || 'N/A'}, Lifestyle: ${lifestyle || 'N/A'}, Budget: ${budget}, Prescription Type: ${prescription_type || 'N/A'}, Preferences: ${preferences}

Provide: 1) Top Frame Styles (3-5), 2) Frame Materials, 3) Color Recommendations, 4) Size Guidance, 5) Lens Considerations, 6) Budget Optimization, 7) Brands to Consider, 8) Styles to Avoid.`;

    const recommendations = await callOpenRouter(prompt);
    await persistAnalysis(req.user?.id, '/api/ai/frame-recommendation', null, recommendations);

    res.json({ recommendations });
  } catch (err) {
    console.error('Frame recommendation error:', err.message);
    res.status(500).json({ error: 'Failed to generate frame recommendations' });
  }
});

// POST /verify-insurance
router.post('/verify-insurance', aiRateLimiter, async (req, res) => {
  try {
    const { provider, coverage_type, copay, deductible, services_needed, policy_details } = req.body;
    if (!provider || !services_needed) return res.status(400).json({ error: 'provider and services_needed are required' });

    const prompt = `As an expert optometry insurance AI assistant, analyze vision insurance coverage.
Provider: ${provider}, Coverage: ${coverage_type}, Copay: $${copay || 'N/A'}, Deductible: $${deductible || 'N/A'}, Services: ${services_needed}, Details: ${policy_details || 'None'}

Provide: 1) Coverage Interpretation, 2) Estimated Patient Responsibility, 3) Covered Services, 4) Frequency Limitations, 5) In-Network vs Out-of-Network, 6) Maximizing Benefits, 7) Common Exclusions, 8) Pre-Authorization needs.

Disclaimer: Verify actual coverage with the insurance provider.`;

    const analysis = await callOpenRouter(prompt);
    await persistAnalysis(req.user?.id, '/api/ai/verify-insurance', null, analysis);

    res.json({ analysis });
  } catch (err) {
    console.error('Verify insurance error:', err.message);
    res.status(500).json({ error: 'Failed to analyze insurance coverage' });
  }
});

// POST /inventory-optimization
router.post('/inventory-optimization', aiRateLimiter, async (req, res) => {
  try {
    const { inventory_data, time_period, practice_size } = req.body;
    if (!inventory_data) return res.status(400).json({ error: 'inventory_data is required' });

    const inventorySummary = Array.isArray(inventory_data)
      ? inventory_data.map(item =>
          `- ${item.item_name} (${item.category}): Qty ${item.quantity}, Unit Cost $${item.unit_cost}, Reorder Level: ${item.reorder_level}, Supplier: ${item.supplier || 'N/A'}`
        ).join('\n')
      : inventory_data;

    const prompt = `As an expert optometry practice management AI, analyze inventory and optimize.
Practice Size: ${practice_size || 'N/A'}, Period: ${time_period || 'Current'}
Inventory:\n${inventorySummary}

Provide: 1) Reorder Recommendations, 2) Reorder Quantities, 3) Slow-Moving Items, 4) Demand Prediction, 5) Cost Optimization, 6) Category Analysis, 7) Par Level Adjustments, 8) Seasonal Considerations, 9) Expiration Risk, 10) Action Items.`;

    const analysis = await callOpenRouter(prompt);
    await persistAnalysis(req.user?.id, '/api/ai/inventory-optimization', null, analysis);

    res.json({ analysis });
  } catch (err) {
    console.error('Inventory optimization error:', err.message);
    res.status(500).json({ error: 'Failed to analyze inventory optimization' });
  }
});

// POST /appointment-optimization
router.post('/appointment-optimization', aiRateLimiter, async (req, res) => {
  try {
    const { appointments, practice_hours, staff_count } = req.body;
    if (!appointments) return res.status(400).json({ error: 'appointments is required' });

    const summary = Array.isArray(appointments)
      ? appointments.map(a => `- ${a.appointment_date} ${a.appointment_time}: ${a.appointment_type} (${a.duration_minutes}min) - ${a.doctor_name} - Status: ${a.status}`).join('\n')
      : JSON.stringify(appointments);

    const prompt = `As an expert optometry practice management AI, optimize the appointment schedule.
Hours: ${practice_hours || '8:00 AM - 5:00 PM, Mon-Fri'}, Staff: ${staff_count || 'N/A'}
Schedule:\n${summary}

Provide: 1) Schedule Optimization, 2) Wait Time Reduction, 3) Appointment Type Distribution, 4) Peak Time Analysis, 5) No-Show Risk, 6) Revenue Optimization, 7) Patient Experience.`;

    const analysis = await callOpenRouter(prompt);
    await persistAnalysis(req.user?.id, '/api/ai/appointment-optimization', null, analysis);

    res.json({ analysis });
  } catch (err) {
    console.error('Appointment optimization error:', err.message);
    res.status(500).json({ error: 'Failed to analyze appointments' });
  }
});

// POST /billing-analysis
router.post('/billing-analysis', aiRateLimiter, async (req, res) => {
  try {
    const { invoices, time_period } = req.body;
    if (!invoices) return res.status(400).json({ error: 'invoices is required' });

    const summary = Array.isArray(invoices)
      ? invoices.map(inv => `- Invoice ${inv.invoice_number}: ${inv.service_description} (Code: ${inv.service_code}) - Amount: $${inv.amount}, Insurance: $${inv.insurance_covered}, Patient: $${inv.patient_responsibility} - Status: ${inv.payment_status}`).join('\n')
      : JSON.stringify(invoices);

    const prompt = `As an expert optometry billing AI, analyze billing data.
Period: ${time_period || 'Current'}
Data:\n${summary}

Provide: 1) Revenue Analysis, 2) Payment Collection, 3) Insurance Optimization, 4) Coding Accuracy, 5) Accounts Receivable, 6) Service Mix, 7) Recommendations.`;

    const analysis = await callOpenRouter(prompt);
    await persistAnalysis(req.user?.id, '/api/ai/billing-analysis', null, analysis);

    res.json({ analysis });
  } catch (err) {
    console.error('Billing analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze billing' });
  }
});

// POST /contact-lens-recommendation
router.post('/contact-lens-recommendation', aiRateLimiter, async (req, res) => {
  try {
    const { prescription, lifestyle, wear_preference, eye_conditions, budget } = req.body;

    const prompt = `As an expert optometry AI, recommend contact lenses.
Prescription: ${JSON.stringify(prescription || {})}, Lifestyle: ${lifestyle || 'N/A'}, Wear Preference: ${wear_preference || 'N/A'}, Eye Conditions: ${eye_conditions || 'None'}, Budget: ${budget || 'N/A'}

Provide: 1) Top Lens Recommendations (3-5), 2) Lens Material, 3) Wear Schedule, 4) Replacement Schedule, 5) Special Considerations, 6) Care Instructions, 7) Trial Lens Plan, 8) Warning Signs.`;

    const recommendations = await callOpenRouter(prompt);
    await persistAnalysis(req.user?.id, '/api/ai/contact-lens-recommendation', null, recommendations);

    res.json({ recommendations });
  } catch (err) {
    console.error('Contact lens recommendation error:', err.message);
    res.status(500).json({ error: 'Failed to generate contact lens recommendations' });
  }
});

// POST /visual-acuity-analysis
router.post('/visual-acuity-analysis', aiRateLimiter, async (req, res) => {
  try {
    const { acuity_records, patient_age, medical_history } = req.body;
    if (!acuity_records) return res.status(400).json({ error: 'acuity_records is required' });

    const summary = Array.isArray(acuity_records)
      ? acuity_records.map(r => `Date: ${r.test_date} | OD: ${r.right_uncorrected}/${r.right_corrected} | OS: ${r.left_uncorrected}/${r.left_corrected} | OU: ${r.both_corrected} | Pinhole: OD ${r.pinhole_right || 'N/A'} OS ${r.pinhole_left || 'N/A'}`).join('\n')
      : JSON.stringify(acuity_records);

    const prompt = `As an expert optometry AI, analyze visual acuity records.
Patient Age: ${patient_age || 'N/A'}, Medical History: ${medical_history || 'N/A'}
Records:\n${summary}

Provide: 1) Acuity Assessment, 2) Correction Effectiveness, 3) Progression Analysis, 4) Pinhole Response, 5) Clinical Concerns, 6) Differential Considerations, 7) Further Testing, 8) Patient Communication.`;

    const analysis = await callOpenRouter(prompt);
    await persistAnalysis(req.user?.id, '/api/ai/visual-acuity-analysis', null, analysis);

    res.json({ analysis });
  } catch (err) {
    console.error('Visual acuity analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze visual acuity' });
  }
});

// POST /diagnose - Diagnosis assistant: accepts symptoms + findings, returns differential diagnosis
router.post('/diagnose', aiRateLimiter, async (req, res) => {
  try {
    const { symptoms, examination_findings, patient_age, patient_history, chief_complaint } = req.body;
    if (!symptoms && !examination_findings) {
      return res.status(400).json({ error: 'symptoms or examination_findings are required' });
    }

    const jsonInstruction = `First respond with this JSON:
{
  "differential_diagnoses": [
    {
      "diagnosis": "...",
      "probability": "high|medium|low",
      "probability_percentage": 0,
      "icd10_code": "...",
      "key_supporting_findings": ["..."],
      "against_this_diagnosis": ["..."]
    }
  ],
  "recommended_tests": [
    {"test": "...", "priority": "urgent|routine|optional", "rationale": "..."}
  ],
  "red_flags": ["..."],
  "immediate_action_needed": true|false,
  "follow_up_timeline": "...",
  "clinical_summary": "..."
}
Then provide detailed clinical reasoning.`;

    const prompt = `${jsonInstruction}

As an expert optometry/ophthalmology AI assistant, perform differential diagnosis.

Patient Age: ${patient_age || 'Not specified'}
Chief Complaint: ${chief_complaint || 'Not specified'}
Symptoms: ${symptoms || 'Not provided'}
Examination Findings: ${examination_findings || 'Not provided'}
Patient History: ${patient_history || 'Not provided'}

Provide: 1) Ranked differential diagnoses with probabilities, 2) Recommended tests/procedures, 3) Red flags requiring urgent referral, 4) Management approach, 5) Patient communication points.

IMPORTANT: This is AI-assisted analysis only. Must be reviewed by a licensed optometrist or ophthalmologist.`;

    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/diagnose', null, analysis);

    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Diagnose error:', err.message);
    res.status(500).json({ error: 'Failed to generate diagnosis' });
  }
});

// POST /patient-risk-score
router.post('/patient-risk-score', aiRateLimiter, async (req, res) => {
  try {
    const { patient_id, family_history, prescription_history, comorbidities } = req.body || {};
    let patient = null, prescriptions = [];
    if (patient_id) {
      try { const r = await pool.query('SELECT * FROM patients WHERE id=$1', [patient_id]); patient = r.rows[0]; } catch {}
      try { const r = await pool.query('SELECT * FROM prescriptions WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 20', [patient_id]); prescriptions = r.rows; } catch {}
    }
    const prompt = `Score this patient's risk for progressive eye disease (glaucoma, diabetic retinopathy, AMD).
Patient: ${JSON.stringify(patient || req.body)}
Prescription history: ${JSON.stringify(prescriptions)}
Family history: ${JSON.stringify(family_history || [])}
Comorbidities: ${JSON.stringify(comorbidities || [])}

Return JSON only: { "overall_risk": "low|moderate|high|very-high", "risk_score_0_100": number, "by_condition": [{"condition": string, "risk": "low|moderate|high", "rationale": string}], "recommended_screening_interval_months": number, "actions": [string], "disclaimer": string }`;
    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/patient-risk-score', patient_id || null, analysis);
    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Patient risk score error:', err.message);
    res.status(500).json({ error: 'Failed to score patient risk' });
  }
});

// POST /schedule-optimization
router.post('/schedule-optimization', aiRateLimiter, async (req, res) => {
  try {
    const { date_range, providers, capacity_constraints } = req.body || {};
    let appts = [];
    try { const r = await pool.query('SELECT * FROM appointments ORDER BY scheduled_at DESC LIMIT 200'); appts = r.rows; } catch {}
    const prompt = `Optimize this clinic schedule. Predict no-shows and recommend overbooking strategy.
Date range: ${date_range || 'next 7 days'}
Providers: ${JSON.stringify(providers || [])}
Capacity constraints: ${JSON.stringify(capacity_constraints || {})}
Recent appointments: ${JSON.stringify(appts).slice(0, 5000)}

Return JSON only: { "no_show_predictions": [{"appointment_id": any, "no_show_probability": number, "recommendation": string}], "overbooking_recommendations": [{"slot": string, "extra_bookings": number, "rationale": string}], "schedule_balance_score_0_100": number, "actions": [string] }`;
    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/schedule-optimization', null, analysis);
    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Schedule optimization error:', err.message);
    res.status(500).json({ error: 'Failed to optimize schedule' });
  }
});

// POST /recall-impact-assess
router.post('/recall-impact-assess', aiRateLimiter, async (req, res) => {
  try {
    const { recall_notice, product_identifiers } = req.body || {};
    if (!recall_notice) return res.status(400).json({ error: 'recall_notice required' });
    let inventory = [];
    try { const r = await pool.query('SELECT * FROM inventory LIMIT 200'); inventory = r.rows; } catch {}
    const prompt = `Assess the impact of this product recall on our clinic.
Recall notice: ${recall_notice}
Product identifiers (from recall): ${JSON.stringify(product_identifiers || [])}
Inventory snapshot: ${JSON.stringify(inventory).slice(0, 5000)}

Return JSON only: { "affected_inventory_items": [{"item_id": any, "name": string, "quantity": number, "action": string}], "affected_patients_likely": number, "patient_notification_template": string, "regulatory_steps": [string], "severity": "low|medium|high|critical", "summary": string }`;
    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/recall-impact-assess', null, analysis);
    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Recall impact assess error:', err.message);
    res.status(500).json({ error: 'Failed to assess recall impact' });
  }
});

// POST /frame-style-suggest
router.post('/frame-style-suggest', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured' });
    }
    const { face_shape, style_persona, occasion, color_palette, gender, age_band, budget } = req.body || {};
    if (!face_shape || !style_persona) {
      return res.status(400).json({ error: 'face_shape and style_persona are required' });
    }

    let frames = [];
    try {
      const r = await pool.query('SELECT id, brand, model, material, color, shape, price FROM frames LIMIT 60');
      frames = r.rows;
    } catch {}

    const prompt = `As an expert optical stylist, suggest frame styles tailored to the requester.
Face shape: ${face_shape}
Style persona: ${style_persona}
Occasion: ${occasion || 'everyday'}
Preferred color palette: ${color_palette || 'neutral'}
Gender presentation: ${gender || 'unspecified'}
Age band: ${age_band || 'adult'}
Budget: ${budget || 'flexible'}
Inventory snapshot (may be empty): ${JSON.stringify(frames).slice(0, 4000)}

Return JSON only: { "top_styles": [{"style": string, "rationale": string, "matching_inventory_ids": [number]}], "color_recommendations": [string], "shape_recommendations": [string], "materials": [string], "looks_to_avoid": [string], "confidence_0_100": number, "summary": string }`;

    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/frame-style-suggest', null, analysis);
    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Frame style suggest error:', err.message);
    res.status(500).json({ error: 'Failed to generate frame style suggestions' });
  }
});

// POST /rx-interaction-check — drug interaction & ophthalmic-relevant interaction check
//
// Env vars:
//   OPENROUTER_API_KEY (required) — endpoint returns 503 if unset.
//
// MECHANICAL: text-only AI evaluation of drug+Rx interactions including
// ocular side-effects. Inventories patient prescriptions if patient_id is
// provided; otherwise uses caller-supplied medications/eye_drops lists.
router.post('/rx-interaction-check', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured', missing: 'OPENROUTER_API_KEY' });
    }
    const { patient_id, medications, eye_drops, allergies, conditions } = req.body || {};

    let patient = null;
    let pastPrescriptions = [];
    if (patient_id) {
      try {
        const r = await pool.query('SELECT id, first_name, last_name, date_of_birth, medical_history FROM patients WHERE id=$1', [patient_id]);
        patient = r.rows[0] || null;
      } catch {}
      try {
        const r = await pool.query('SELECT * FROM prescriptions WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 20', [patient_id]);
        pastPrescriptions = r.rows;
      } catch {}
    }

    const meds = Array.isArray(medications) ? medications : [];
    const drops = Array.isArray(eye_drops) ? eye_drops : [];
    if (meds.length + drops.length === 0 && !patient_id) {
      return res.status(400).json({ error: 'Provide patient_id or a non-empty medications / eye_drops list' });
    }

    const prompt = `As an AI optometry assistant, evaluate drug-drug interactions with a focus on ocular impact.

Patient (may be partial): ${JSON.stringify(patient || { id: patient_id })}
Allergies: ${JSON.stringify(allergies || [])}
Comorbid conditions: ${JSON.stringify(conditions || [])}
Systemic medications: ${JSON.stringify(meds)}
Topical eye drops: ${JSON.stringify(drops)}
Recent ophthalmic prescriptions on file: ${JSON.stringify(pastPrescriptions).slice(0, 3000)}

Return JSON only: { "interactions": [{ "drug_a": string, "drug_b": string, "severity": "minor|moderate|major|contraindicated", "mechanism": string, "ocular_concern": string, "management": string }], "ocular_side_effects_to_watch": [string], "alternative_suggestions": [{ "replace": string, "with": string, "rationale": string }], "monitoring_plan": [string], "disclaimer": "AI-assisted, must be reviewed by a licensed clinician" }`;

    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/rx-interaction-check', patient_id || null, analysis);
    res.json({ analysis, result_json: parsedJson });
  } catch (err) {
    console.error('Rx interaction check error:', err.message);
    res.status(500).json({ error: 'Failed to check Rx interactions' });
  }
});

// POST /agentic-patient-followup — agentic patient follow-up planner.
//
// Env vars:
//   OPENROUTER_API_KEY    (required) — gates endpoint, returns 503 if unset.
//   TWILIO_AUTH_TOKEN     (required for `send=true` send mode) — without it, the
//                          endpoint stays in "draft" mode and returns the
//                          composed messages for human review.
//   TWILIO_ACCOUNT_SID    (required for send mode) — also documented as missing.
//   TWILIO_FROM_NUMBER    (required for send mode) — SMS sender.
//
// NEEDS-CREDS: only the AI draft is generated when SMS creds are missing;
// actually sending the SMS is gated and surfaced to the caller.
router.post('/agentic-patient-followup', aiRateLimiter, async (req, res) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(503).json({ error: 'AI service unavailable: OPENROUTER_API_KEY not configured', missing: 'OPENROUTER_API_KEY' });
    }
    const { patient_id, reason, channels, send } = req.body || {};
    if (!patient_id) return res.status(400).json({ error: 'patient_id is required' });

    let patient = null, lastAppt = null, lastRx = null;
    try {
      const r = await pool.query('SELECT id, first_name, last_name, email, phone, medical_history FROM patients WHERE id=$1', [patient_id]);
      patient = r.rows[0] || null;
    } catch {}
    if (!patient) return res.status(404).json({ error: 'Patient not found' });

    try {
      const r = await pool.query('SELECT * FROM appointments WHERE patient_id=$1 ORDER BY appointment_date DESC LIMIT 1', [patient_id]);
      lastAppt = r.rows[0] || null;
    } catch {}
    try {
      const r = await pool.query('SELECT * FROM prescriptions WHERE patient_id=$1 ORDER BY created_at DESC LIMIT 1', [patient_id]);
      lastRx = r.rows[0] || null;
    } catch {}

    const requestedChannels = Array.isArray(channels) && channels.length > 0 ? channels : ['email', 'sms'];

    const prompt = `Draft a personalised optometry patient follow-up plan.

Patient: ${JSON.stringify({ name: `${patient.first_name} ${patient.last_name}`, email: patient.email, phone: patient.phone, history: patient.medical_history })}
Reason for follow-up: ${reason || 'general recall'}
Last appointment: ${JSON.stringify(lastAppt || {})}
Most recent prescription: ${JSON.stringify(lastRx || {})}
Channels: ${JSON.stringify(requestedChannels)}

Return JSON only: { "plan": [{ "channel": "email|sms|phone", "send_in_days": int, "subject": string, "message": string, "rationale": string }], "tone": string, "compliance_notes": [string], "summary": string }`;

    const analysis = await callOpenRouter(prompt, true);
    const parsedJson = await persistAnalysis(req.user?.id, '/api/ai/agentic-patient-followup', patient_id, analysis);

    // Send mode: explicitly gated on Twilio credentials, never invoked by default.
    let dispatch = { mode: 'draft', sent: [], skipped: requestedChannels };
    if (send === true) {
      const missing = [];
      if (!process.env.TWILIO_AUTH_TOKEN) missing.push('TWILIO_AUTH_TOKEN');
      if (!process.env.TWILIO_ACCOUNT_SID) missing.push('TWILIO_ACCOUNT_SID');
      if (!process.env.TWILIO_FROM_NUMBER) missing.push('TWILIO_FROM_NUMBER');
      if (missing.length > 0) {
        return res.status(503).json({
          error: 'SMS dispatch unavailable: required credentials missing',
          missing,
          analysis,
          result_json: parsedJson,
          dispatch: { mode: 'draft-only', reason: 'missing-credentials' }
        });
      }
      // Even with creds, this endpoint stays draft-only — actual Twilio
      // integration intentionally not implemented here. Real send requires
      // a separate, audited dispatch worker.
      dispatch = { mode: 'creds-present-noop', sent: [], skipped: requestedChannels, note: 'Twilio creds present but dispatch worker not wired in this pass.' };
    }

    res.json({ analysis, result_json: parsedJson, dispatch });
  } catch (err) {
    console.error('Agentic patient followup error:', err.message);
    res.status(500).json({ error: 'Failed to draft patient follow-up' });
  }
});

export default router;
