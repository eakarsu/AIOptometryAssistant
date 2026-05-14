/**
 * Input validation middleware helpers for Optometry backend.
 * Works standalone without express-validator package.
 */

function validateBody(rules) {
  return (req, res, next) => {
    const errors = [];

    rules.forEach(rule => {
      const value = req.body[rule.field];
      const label = rule.label || rule.field;

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: rule.field, msg: `${label} is required` });
        return;
      }

      if (value !== undefined && value !== null && value !== '') {
        if (rule.type === 'number') {
          const num = Number(value);
          if (isNaN(num)) {
            errors.push({ field: rule.field, msg: `${label} must be a number` });
          } else if (rule.min !== undefined && num < rule.min) {
            errors.push({ field: rule.field, msg: `${label} must be at least ${rule.min}` });
          } else if (rule.max !== undefined && num > rule.max) {
            errors.push({ field: rule.field, msg: `${label} must be at most ${rule.max}` });
          }
        }

        if (rule.type === 'email') {
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            errors.push({ field: rule.field, msg: `${label} must be a valid email` });
          }
        }

        if (!rule.type || rule.type === 'string') {
          if (rule.minLength && String(value).length < rule.minLength) {
            errors.push({ field: rule.field, msg: `${label} must be at least ${rule.minLength} characters` });
          }
          if (rule.maxLength && String(value).length > rule.maxLength) {
            errors.push({ field: rule.field, msg: `${label} must be at most ${rule.maxLength} characters` });
          }
          if (rule.enum && !rule.enum.includes(value)) {
            errors.push({ field: rule.field, msg: `${label} must be one of: ${rule.enum.join(', ')}` });
          }
        }
      }
    });

    if (errors.length > 0) {
      return res.status(400).json({ errors, error: errors[0].msg });
    }
    next();
  };
}

// Reusable validation rules
export const patientValidation = validateBody([
  { field: 'first_name', required: true, minLength: 1, maxLength: 100 },
  { field: 'last_name', required: true, minLength: 1, maxLength: 100 },
  { field: 'email', type: 'email' },
]);

export const prescriptionValidation = validateBody([
  { field: 'patient_id', required: true, type: 'number', min: 1 },
  { field: 'exam_date', required: true },
]);

export const diagnoseValidation = validateBody([
  // at least one of symptoms or examination_findings must be present
  // handled in route logic
]);

export { validateBody };
