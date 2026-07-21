'use strict';
function evaluate(input = {}) {
  const errors = [], patient = input.patient || {}, observations = input.observations || [],
    decisions = input.decisions || [], followUps = input.followUps || [];
  if (!patient.id || !patient.consent?.version || !patient.consent?.grantedAt || patient.consent?.revokedAt ||
      !(patient.retentionDays > 0)) errors.push('patient identity, active consent, and retention policy required');
  const observationIds = new Set();
  for (const observation of observations) {
    if (!observation.id || observationIds.has(String(observation.id)) || !observation.observedAt ||
        !observation.type || !observation.unit || !observation.sourceVersion ||
        !Number.isFinite(Number(observation.value))) errors.push(`observation ${observation.id || '?'} invalid`);
    observationIds.add(String(observation.id));
    if (observation.deviceRef && !observation.calibrationVersion) errors.push('device observation lacks calibration');
  }
  const decisionIds = new Set();
  for (const decision of decisions) {
    decisionIds.add(String(decision.id));
    if (!decision.id || !decision.ownerClinicianId || !decision.modelVersion || !decision.uncertaintyNote ||
        !Array.isArray(decision.observationIds) || decision.observationIds.some((id) => !observationIds.has(String(id))) ||
        decision.diagnosis || decision.autonomousTreatment) errors.push(`decision ${decision.id || '?'} crosses evidence/non-diagnostic boundary`);
    if (!(decision.confidence >= 0 && decision.confidence <= 1)) errors.push('decision confidence invalid');
    if (decision.urgency === 'emergency' && !decision.escalationAt) errors.push('emergency lacks escalation');
  }
  for (const followUp of followUps) if (!followUp.id || !decisionIds.has(String(followUp.decisionId)) ||
      !followUp.ownerId || Number.isNaN(Date.parse(followUp.dueAt)) ||
      !['scheduled','completed','escalated'].includes(followUp.status)) errors.push('follow-up invalid');
  for (const referral of input.referrals || []) if (!referral.id || !decisionIds.has(String(referral.decisionId)) ||
      !referral.specialty || !referral.ownerClinicianId || !referral.reasonCode ||
      referral.transmitted === true) errors.push('referral must remain owned, evidenced, and queued');
  const validation = input.validation || {};
  if (!validation.datasetVersion || !Number.isFinite(Number(validation.calibrationError)) ||
      !Number.isFinite(Number(validation.falseNegativeRate)) || validation.contraindicationCasesPassed !== true ||
      validation.missingDataCasesPassed !== true || validation.biasStrataReviewed !== true ||
      validation.escalationCasesPassed !== true) errors.push('versioned clinical validation required');
  return { errors, result: { observationCount: observations.length, decisionCount: decisions.length,
    followUpCount: followUps.length, referralCount: (input.referrals || []).length, validation,
    decision: errors.length ? 'revise' : 'reviewable' },
    assumptions: ['observations require confirmation in the authoritative clinical record'],
    uncertainty: { nonDiagnostic: true, optometristApprovalRequired: true, devicesNotConnected: true } };
}
module.exports = { evaluate };
