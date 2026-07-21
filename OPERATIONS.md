# Governed optometry operations

## Intended use and limits

The governed API is non-diagnostic clinical decision support for versioned observations, clinician-owned decisions, follow-up, and referrals. It never autonomously diagnoses, treats, or transmits a referral. Emergency findings require escalation, and final action requires a qualified independent clinician. Validate calibration, false-negative rate, contraindications, missing data, bias strata, and escalation behavior before clinical release.

## Data and integrations

Signed tenant claims, scoped consent, retention, units, device calibration, model version, confidence, and uncertainty are mandatory. EHR/FHIR, lab, imaging, device, pharmacy, scheduling, payer, and referral actions are approval-gated outbox records. Provider credentials never enter payloads; replay uses the original idempotency key and request hash. Dead letters and reconciliation differences require clinical and integration-owner review.

## Deploy, rollback, and recovery

Run `./start.sh check`, back up PostgreSQL, and explicitly run `ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`. Roll back code independently of additive tables. Do not down-migrate or erase clinical audit history during incident response. Rotate JWT/provider secrets in the secret manager, restart, and invalidate old tokens. Restore only from verified backups and reconcile every external receipt after recovery.

Erasure completes only after delivered provider-deletion receipts. Alert on missing consent, uncalibrated devices, emergency escalation gaps, self-approval, stale follow-up, dead letters, and validation threshold regressions.
