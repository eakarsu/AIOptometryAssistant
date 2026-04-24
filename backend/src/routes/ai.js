import express from 'express';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../../.env') });

const router = express.Router();

/**
 * Helper function to call OpenRouter AI API
 * @param {string} prompt - The prompt to send to the AI model
 * @returns {string} The AI response content
 */
async function callOpenRouter(prompt) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'AI Optometry Assistant'
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an expert AI optometry assistant. Provide professional, accurate, and detailed responses related to optometry, ophthalmology, and vision care. Always note that your analysis is AI-assisted and should be reviewed by a licensed optometrist or ophthalmologist.'
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// POST /analyze-retinal-scan
router.post('/analyze-retinal-scan', async (req, res) => {
  try {
    const { findings, risk_level, patient_age, eye } = req.body;

    const prompt = `As an expert optometry AI assistant, analyze the following retinal scan data and provide a comprehensive assessment.

Eye: ${eye || 'Not specified'}
Patient Age: ${patient_age || 'Not provided'}

Findings from the scan:
${findings}

Risk Level: ${risk_level || 'Not assessed'}

Please provide a detailed analysis including:
1. **Diagnosis Suggestions**: Based on the findings, what are the most likely diagnoses? List them in order of probability.
2. **Risk Assessment**: Evaluate the severity and urgency of the findings. Categorize as low, moderate, or high risk.
3. **Detailed Findings Interpretation**: Explain what each finding means in clinical terms.
4. **Recommended Follow-ups**: What additional tests, imaging, or specialist referrals should be considered?
5. **Treatment Considerations**: General treatment approaches that may be applicable.
6. **Patient Education Points**: Key information to communicate to the patient.

Note: This is an AI-assisted analysis and must be reviewed and confirmed by a licensed eye care professional.`;

    const analysis = await callOpenRouter(prompt);
    res.json({ analysis });
  } catch (err) {
    console.error('Analyze retinal scan error:', err.message);
    res.status(500).json({ error: 'Failed to analyze retinal scan' });
  }
});

// POST /prescription-trends
router.post('/prescription-trends', async (req, res) => {
  try {
    const { prescriptions, patient_name, patient_age } = req.body;

    const prescriptionSummary = prescriptions.map((rx, i) => `
Prescription ${i + 1} (Date: ${rx.exam_date}):
  Right Eye (OD): Sphere ${rx.right_sphere}, Cylinder ${rx.right_cylinder}, Axis ${rx.right_axis}, Add ${rx.right_add || 'N/A'}
  Left Eye (OS): Sphere ${rx.left_sphere}, Cylinder ${rx.left_cylinder}, Axis ${rx.left_axis}, Add ${rx.left_add || 'N/A'}
  PD: ${rx.pd || 'N/A'}
  Notes: ${rx.notes || 'None'}
  AI Trend Analysis: ${rx.ai_trend_analysis || 'None'}`).join('\n');

    const prompt = `As an expert optometry AI assistant, analyze the following prescription history for a patient and identify trends.

Patient: ${patient_name || 'Not provided'}
Age: ${patient_age || 'Not provided'}

Prescription History (chronological):
${prescriptionSummary}

Please provide a detailed trend analysis including:
1. **Myopia/Hyperopia Progression**: How has the spherical component changed over time for each eye?
2. **Astigmatism Changes**: Any notable changes in cylinder and axis values?
3. **Presbyopia Assessment**: If ADD values are present, how are they progressing?
4. **Rate of Change**: Calculate the approximate annual rate of change in diopters.
5. **Anisometropia Assessment**: Is there a significant difference between the two eyes, and is it growing?
6. **Future Predictions**: Based on current trends, what prescription changes might be expected at the next visit?
7. **Clinical Concerns**: Any patterns that suggest underlying conditions (e.g., rapid progression suggesting keratoconus, diabetes-related changes)?
8. **Recommendations**: Suggested interventions or monitoring schedules.

Note: This is an AI-assisted analysis and must be reviewed by a licensed eye care professional.`;

    const analysis = await callOpenRouter(prompt);
    res.json({ analysis });
  } catch (err) {
    console.error('Prescription trends error:', err.message);
    res.status(500).json({ error: 'Failed to analyze prescription trends' });
  }
});

// POST /frame-recommendation
router.post('/frame-recommendation', async (req, res) => {
  try {
    const { face_shape, preferences, budget, prescription_type, skin_tone, lifestyle } = req.body;

    const prompt = `As an expert optometry and eyewear AI assistant, recommend frames based on the following patient information.

Face Shape: ${face_shape}
Skin Tone: ${skin_tone || 'Not specified'}
Lifestyle: ${lifestyle || 'Not specified'}
Budget Range: ${budget}
Prescription Type: ${prescription_type || 'Not specified'}
Style Preferences: ${preferences}

Please provide detailed frame recommendations including:
1. **Top Frame Styles**: Recommend 3-5 frame styles that would suit this face shape, explaining why each works.
2. **Frame Materials**: Suggest appropriate materials based on lifestyle and budget (e.g., titanium, acetate, TR-90).
3. **Color Recommendations**: What frame colors would complement the described features?
4. **Size Guidance**: Recommended frame dimensions (lens width, bridge width, temple length).
5. **Lens Considerations**: Based on the prescription type, what lens options should be discussed (progressive, high-index, blue light filtering)?
6. **Budget Optimization**: How to get the best value within the stated budget range.
7. **Brands to Consider**: Suggest specific brand categories (luxury, mid-range, budget-friendly) that fit the criteria.
8. **Avoid**: Frame styles or features that typically do not work well with this face shape.

Provide the recommendations in a friendly, consultative tone suitable for sharing with the patient.`;

    const recommendations = await callOpenRouter(prompt);
    res.json({ recommendations });
  } catch (err) {
    console.error('Frame recommendation error:', err.message);
    res.status(500).json({ error: 'Failed to generate frame recommendations' });
  }
});

// POST /verify-insurance
router.post('/verify-insurance', async (req, res) => {
  try {
    const {
      provider, coverage_type, copay, deductible,
      services_needed, policy_details
    } = req.body;

    const prompt = `As an expert optometry insurance AI assistant, help interpret the following vision insurance coverage and estimate patient responsibility.

Insurance Provider: ${provider}
Coverage Type: ${coverage_type}
Copay: $${copay || 'Not specified'}
Deductible: $${deductible || 'Not specified'}
Services Needed: ${services_needed}
Additional Policy Details: ${policy_details || 'None provided'}

Please provide a detailed insurance analysis including:
1. **Coverage Interpretation**: Explain what this type of plan typically covers for vision care.
2. **Estimated Patient Responsibility**: Based on typical ${provider} ${coverage_type} plans, estimate out-of-pocket costs for the services needed.
3. **Covered Services**: List which of the requested services are typically covered and at what percentage.
4. **Frequency Limitations**: Common frequency limitations for exams, lenses, and frames.
5. **In-Network vs Out-of-Network**: Explain the typical cost difference.
6. **Maximizing Benefits**: Tips for getting the most value from this insurance plan.
7. **Common Exclusions**: Services or products that are typically NOT covered.
8. **Pre-Authorization**: Whether any of the requested services typically require pre-authorization.

Disclaimer: This is an AI-assisted estimate based on typical plan structures. Actual coverage should be verified directly with the insurance provider. Benefits may vary by specific plan and employer.`;

    const analysis = await callOpenRouter(prompt);
    res.json({ analysis });
  } catch (err) {
    console.error('Verify insurance error:', err.message);
    res.status(500).json({ error: 'Failed to analyze insurance coverage' });
  }
});

// POST /inventory-optimization
router.post('/inventory-optimization', async (req, res) => {
  try {
    const { inventory_data, time_period, practice_size } = req.body;

    const inventorySummary = Array.isArray(inventory_data)
      ? inventory_data.map(item =>
          `- ${item.item_name} (${item.category}): Qty ${item.quantity}, Unit Cost $${item.unit_cost}, Reorder Level: ${item.reorder_level}, Supplier: ${item.supplier || 'N/A'}`
        ).join('\n')
      : inventory_data;

    const prompt = `As an expert optometry practice management AI assistant, analyze the following inventory data and provide optimization recommendations.

Practice Size: ${practice_size || 'Not specified'}
Analysis Period: ${time_period || 'Current snapshot'}

Current Inventory:
${inventorySummary}

Please provide a comprehensive inventory optimization analysis including:
1. **Reorder Recommendations**: Which items need to be reordered immediately based on current quantities vs reorder levels?
2. **Suggested Reorder Quantities**: For each item needing reorder, recommend optimal order quantities considering holding costs and order frequency.
3. **Slow-Moving Inventory**: Identify items that may be overstocked or slow-moving based on typical optometry practice patterns.
4. **Demand Prediction**: Based on typical optometry practice patterns, predict which items will see increased or decreased demand in the coming months.
5. **Cost Optimization**: Identify opportunities to reduce costs through bulk ordering, alternative suppliers, or product substitutions.
6. **Category Analysis**: Break down inventory health by category (lenses, frames, contact lenses, solutions, equipment, etc.).
7. **Par Level Adjustments**: Suggest adjustments to reorder levels based on the practice size and typical usage patterns.
8. **Seasonal Considerations**: Flag any items that may need seasonal inventory adjustments (e.g., sunglasses, allergy eye drops).
9. **Expiration Risk**: Identify product categories at risk of expiration if overstocked.
10. **Action Items**: Prioritized list of immediate actions to optimize inventory.

Provide specific, actionable recommendations that a practice manager can implement immediately.`;

    const analysis = await callOpenRouter(prompt);
    res.json({ analysis });
  } catch (err) {
    console.error('Inventory optimization error:', err.message);
    res.status(500).json({ error: 'Failed to analyze inventory optimization' });
  }
});

// POST /appointment-optimization
router.post('/appointment-optimization', async (req, res) => {
  try {
    const { appointments, practice_hours, staff_count } = req.body;
    const summary = Array.isArray(appointments)
      ? appointments.map(a => `- ${a.appointment_date} ${a.appointment_time}: ${a.appointment_type} (${a.duration_minutes}min) - ${a.doctor_name} - Status: ${a.status}`).join('\n')
      : JSON.stringify(appointments);

    const prompt = `As an expert optometry practice management AI, analyze the following appointment schedule and provide optimization recommendations.

Practice Hours: ${practice_hours || '8:00 AM - 5:00 PM, Mon-Fri'}
Staff Count: ${staff_count || 'Not specified'}

Current Schedule:
${summary}

Please provide:
1. **Schedule Optimization**: Identify gaps, overbooking risks, and suggest better time allocation.
2. **Wait Time Reduction**: Recommendations to minimize patient wait times.
3. **Appointment Type Distribution**: Analyze the mix and suggest optimal scheduling patterns.
4. **Peak Time Analysis**: Identify busy periods and suggest load balancing.
5. **No-Show Risk**: Flag appointments at higher risk of no-shows.
6. **Revenue Optimization**: Suggest scheduling changes to maximize billable hours.
7. **Patient Experience**: Recommendations to improve the scheduling experience.

Note: AI-assisted analysis for practice management optimization.`;

    const analysis = await callOpenRouter(prompt);
    res.json({ analysis });
  } catch (err) {
    console.error('Appointment optimization error:', err.message);
    res.status(500).json({ error: 'Failed to analyze appointments' });
  }
});

// POST /billing-analysis
router.post('/billing-analysis', async (req, res) => {
  try {
    const { invoices, time_period } = req.body;
    const summary = Array.isArray(invoices)
      ? invoices.map(inv => `- Invoice ${inv.invoice_number}: ${inv.service_description} (Code: ${inv.service_code}) - Amount: $${inv.amount}, Insurance: $${inv.insurance_covered}, Patient: $${inv.patient_responsibility} - Status: ${inv.payment_status}`).join('\n')
      : JSON.stringify(invoices);

    const prompt = `As an expert optometry billing AI assistant, analyze the following billing data.

Period: ${time_period || 'Current'}

Billing Data:
${summary}

Please provide:
1. **Revenue Analysis**: Total revenue, average per visit, breakdown by service type.
2. **Payment Collection**: Outstanding balances and collection strategies.
3. **Insurance Optimization**: Maximize reimbursements.
4. **Coding Accuracy**: Flag potential under-coding or bundling opportunities.
5. **Accounts Receivable**: Aging analysis and recommendations.
6. **Service Mix**: Most/least profitable services.
7. **Recommendations**: Specific actions to improve practice revenue.

Note: AI-assisted billing analysis. Verify coding with certified billing professionals.`;

    const analysis = await callOpenRouter(prompt);
    res.json({ analysis });
  } catch (err) {
    console.error('Billing analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze billing' });
  }
});

// POST /contact-lens-recommendation
router.post('/contact-lens-recommendation', async (req, res) => {
  try {
    const { prescription, lifestyle, wear_preference, eye_conditions, budget } = req.body;

    const prompt = `As an expert optometry AI assistant, recommend contact lenses based on the following patient information.

Prescription Data: ${JSON.stringify(prescription || {})}
Lifestyle: ${lifestyle || 'Not specified'}
Wear Preference: ${wear_preference || 'Not specified'}
Eye Conditions: ${eye_conditions || 'None reported'}
Budget: ${budget || 'Not specified'}

Please provide:
1. **Top Lens Recommendations**: Suggest 3-5 specific contact lens brands/models with reasons.
2. **Lens Material**: Recommend material type based on needs.
3. **Wear Schedule**: Daily disposable vs extended wear analysis.
4. **Replacement Schedule**: Optimal replacement frequency.
5. **Special Considerations**: Toric, multifocal, etc.
6. **Care Instructions**: Personalized care routine.
7. **Trial Lens Plan**: Suggested fitting approach.
8. **Warning Signs**: What to watch for.

Note: AI-assisted recommendation. Final lens selection requires professional fitting.`;

    const recommendations = await callOpenRouter(prompt);
    res.json({ recommendations });
  } catch (err) {
    console.error('Contact lens recommendation error:', err.message);
    res.status(500).json({ error: 'Failed to generate contact lens recommendations' });
  }
});

// POST /visual-acuity-analysis
router.post('/visual-acuity-analysis', async (req, res) => {
  try {
    const { acuity_records, patient_age, medical_history } = req.body;
    const summary = Array.isArray(acuity_records)
      ? acuity_records.map(r => `Date: ${r.test_date} | OD: ${r.right_uncorrected} (uncorr) / ${r.right_corrected} (corr) | OS: ${r.left_uncorrected} (uncorr) / ${r.left_corrected} (corr) | OU: ${r.both_corrected} (corr) | Pinhole: OD ${r.pinhole_right || 'N/A'} OS ${r.pinhole_left || 'N/A'}`).join('\n')
      : JSON.stringify(acuity_records);

    const prompt = `As an expert optometry AI assistant, analyze the following visual acuity records.

Patient Age: ${patient_age || 'Not specified'}
Medical History: ${medical_history || 'Not specified'}

Visual Acuity Records:
${summary}

Please provide:
1. **Acuity Assessment**: Interpret current visual acuity levels for each eye.
2. **Correction Effectiveness**: How well is current correction improving vision?
3. **Progression Analysis**: Trends in vision changes over time.
4. **Pinhole Response**: Interpret pinhole results (refractive vs pathological).
5. **Clinical Concerns**: Concerning patterns (asymmetry, sudden changes).
6. **Differential Considerations**: Possible causes for deficits.
7. **Further Testing**: Recommend additional tests if indicated.
8. **Patient Communication**: How to explain findings.

Note: AI-assisted analysis. Must be confirmed by clinical examination.`;

    const analysis = await callOpenRouter(prompt);
    res.json({ analysis });
  } catch (err) {
    console.error('Visual acuity analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze visual acuity' });
  }
});

export default router;
