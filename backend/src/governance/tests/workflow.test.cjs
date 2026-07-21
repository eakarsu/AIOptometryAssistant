'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain.cjs');

const valid = () => ({
  patient: { id: 'p1', retentionDays: 365, consent: { version: 'v1', grantedAt: '2026-07-18T00:00:00Z' } },
  observations: [{ id: 'o1', observedAt: '2026-07-18T12:00:00Z', type: 'visual-acuity', unit: 'logMAR', value: 0.1, sourceVersion: 'ehr-v2', deviceRef: 'device:1', calibrationVersion: 'cal-v3' }],
  decisions: [{ id: 'd1', ownerClinicianId: 'optometrist-1', modelVersion: 'm2', uncertaintyNote: 'device variability', observationIds: ['o1'], confidence: 0.82, urgency: 'routine', autonomousTreatment: false }],
  followUps: [{ id: 'f1', decisionId: 'd1', ownerId: 'optometrist-1', dueAt: '2026-07-25T12:00:00Z', status: 'scheduled' }],
  referrals: [{ id: 'r1', decisionId: 'd1', specialty: 'ophthalmology', ownerClinicianId: 'optometrist-1', reasonCode: 'retinal-review', transmitted: false }],
  validation: { datasetVersion: 'd2', calibrationError: 0.02, falseNegativeRate: 0.01, contraindicationCasesPassed: true, missingDataCasesPassed: true, biasStrataReviewed: true, escalationCasesPassed: true }
});

test('accepts non-diagnostic clinician-owned care support', () => assert.deepEqual(evaluate(valid()).errors, []));
test('blocks diagnosis and uncalibrated device evidence', () => { const input = valid(); input.decisions[0].diagnosis = 'glaucoma'; delete input.observations[0].calibrationVersion; assert.ok(evaluate(input).errors.length >= 2); });
