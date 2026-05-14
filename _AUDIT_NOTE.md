# Audit Apply Note — AIOptometryAssistant

Source: `_AUDIT/reports/batch_06.md` section 8.

## Original Recommendations
### Missing AI counterparts
- `/patient-risk-score`
- `/schedule-optimization`
- `/frame-style-suggest`
- `/recall-impact-assess`

### Missing non-AI
- EHR integration (Epic, Allscripts); referral mgmt; telemedicine; patient portal; manufacturer auto-replenishment

### Custom suggestions
- Agentic patient follow-up; CV screening (eye selfie); insurance pre-auth automation; Rx interaction checking; multi-modal frame fit

## Implemented
Added three endpoints in `backend/src/routes/ai.js`:
- `POST /api/ai/patient-risk-score`
- `POST /api/ai/schedule-optimization`
- `POST /api/ai/recall-impact-assess`

Reused `callOpenRouter`, `parseAIJson`, `persistAnalysis`, `aiRateLimiter`, ESM style, and existing `ai_analyses` table.

## Backlog
| Item | Tag |
|---|---|
| `/frame-style-suggest` | MECHANICAL |
| EHR integration (Epic, Allscripts) | NEEDS-CREDS |
| Referral management | NEEDS-PRODUCT-DECISION |
| Telemedicine / video visits | NEEDS-CREDS |
| Patient self-service portal | NEEDS-PRODUCT-DECISION |
| Manufacturer auto-replenishment | NEEDS-CREDS |
| SMS/email patient follow-up | NEEDS-CREDS |

## Apply pass 3 (frontend)

Verified: frontend already wired, including the three pass-2 endpoints.
`frontend/src/services/api.js` defines `aiPatientRiskScore`,
`aiScheduleOptimization`, and `aiRecallImpactAssess` (lines 141–158); the
monolithic `frontend/src/App.jsx` (2,774 lines) calls all three at lines
2260, 2269, 2276. The same App also uses every other AI endpoint
(retinal-scan, frame-recommendation, prescription-trends, billing-analysis,
etc.) plus 5 patient-scoped AI calls (`/api/patients/:id/ai-*`). Auth handled
via `Authorization: Bearer <token>` in `getHeaders()`. Backend `routes/ai.js`
is registered in `server.js` (`app.use('/api/ai', authenticateToken, aiRoutes)`).
Action: LEFT-AS-IS (no FE changes).

## Apply pass 4 (mechanical backlog)

Implemented one MECHANICAL backlog item: `/frame-style-suggest`.

Backend (`backend/src/routes/ai.js`):
- `POST /api/ai/frame-style-suggest` — accepts `face_shape`, `style_persona`, `occasion`, `color_palette`, `gender`, `age_band`, `budget`. Reads up to 60 `frames` rows for inventory context, calls `callOpenRouter` (JSON-mode), persists via existing `persistAnalysis`. Returns 503 when `OPENROUTER_API_KEY` is unset.

Frontend (`frontend/src/services/api.js` + `frontend/src/App.jsx`):
- Added `aiFrameStyleSuggest` helper (returns `{ status: 503, error }` shape on no-key).
- Added a fourth tab "Frame Style Suggest" in the existing `AIPredictivePage` with a form (face shape, style persona, occasion, color palette, gender presentation, age band, budget). Reuses existing JWT bearer (`getHeaders()`).

Backlog still untouched: EHR integration, telemedicine, manufacturer auto-replenishment, SMS/email follow-up (NEEDS-CREDS); referral mgmt and patient portal (NEEDS-PRODUCT-DECISION).

## Apply pass 5 (all backlog)

Picked two more items: `rx-interaction-check` (MECHANICAL — drug-Rx
interaction checking from the audit's "Custom feature suggestions" list,
including ocular side-effects) and `agentic-patient-followup` (the
audit's "Agentic patient follow-up" suggestion, gated as NEEDS-CREDS for
the actual SMS dispatch step).

Backend (`backend/src/routes/ai.js`):
- `POST /api/ai/rx-interaction-check` — accepts `patient_id` (optional),
  `medications`, `eye_drops`, `allergies`, `conditions`. Pulls patient +
  recent prescriptions when an id is provided, returns structured
  interactions, ocular side-effects, alternatives and a monitoring plan.
  Returns 503 with `missing: OPENROUTER_API_KEY` when key unset; 400 if
  no medication / drop / patient_id provided.
- `POST /api/ai/agentic-patient-followup` — accepts `patient_id`
  (required), `reason`, `channels`, `send`. Pulls patient + last
  appointment + most recent prescription, drafts a multi-channel
  follow-up plan. Defaults to draft-only (`mode: "draft"`). When
  `send=true`, gates on `TWILIO_AUTH_TOKEN`, `TWILIO_ACCOUNT_SID` and
  `TWILIO_FROM_NUMBER` and returns 503 with `missing: [...]` listing
  the absent vars; even with all creds present, dispatch is a
  documented no-op (`creds-present-noop`) — actual Twilio integration
  is intentionally out of scope.

Frontend (`frontend/src/services/api.js` + `frontend/src/App.jsx`):
- Added `aiRxInteractionCheck` and `aiAgenticPatientFollowup` helpers,
  both returning `{ status: 503, missing }` on the 503 path.
- Added two more tabs to the existing `AIPredictivePage` (now 6 tabs):
  "Rx Interaction Check" and "Agentic Follow-up". Reuses the same
  `getHeaders()` JWT bearer attachment and result panel.

Smoke test (port 7802, `OPENROUTER_API_KEY=""`):
- `POST /api/auth/login sarah@optometry.com/password123` → HTTP 200.
- `POST /api/ai/rx-interaction-check` → HTTP 503
  `{"missing":"OPENROUTER_API_KEY"}`.
- `POST /api/ai/agentic-patient-followup` → HTTP 503
  `{"missing":"OPENROUTER_API_KEY"}`.

Backlog still untouched: EHR integration, telemedicine, manufacturer
auto-replenishment (NEEDS-CREDS); referral mgmt and patient portal
(NEEDS-PRODUCT-DECISION).

