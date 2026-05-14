const API_BASE = '/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const api = {
  login: async (email, password) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    return res.json();
  },

  // Generic CRUD
  getAll: async (resource) => {
    const res = await fetch(`${API_BASE}/${resource}`, { headers: getHeaders() });
    return res.json();
  },
  getOne: async (resource, id) => {
    const res = await fetch(`${API_BASE}/${resource}/${id}`, { headers: getHeaders() });
    return res.json();
  },
  create: async (resource, data) => {
    const res = await fetch(`${API_BASE}/${resource}`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  update: async (resource, id, data) => {
    const res = await fetch(`${API_BASE}/${resource}/${id}`, {
      method: 'PUT', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  delete: async (resource, id) => {
    const res = await fetch(`${API_BASE}/${resource}/${id}`, {
      method: 'DELETE', headers: getHeaders(),
    });
    return res.json();
  },

  // AI endpoints
  aiAnalyzeRetinalScan: async (data) => {
    const res = await fetch(`${API_BASE}/ai/analyze-retinal-scan`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiPrescriptionTrends: async (data) => {
    const res = await fetch(`${API_BASE}/ai/prescription-trends`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiFrameRecommendation: async (data) => {
    const res = await fetch(`${API_BASE}/ai/frame-recommendation`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiVerifyInsurance: async (data) => {
    const res = await fetch(`${API_BASE}/ai/verify-insurance`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiInventoryOptimization: async (data) => {
    const res = await fetch(`${API_BASE}/ai/inventory-optimization`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiAppointmentOptimization: async (data) => {
    const res = await fetch(`${API_BASE}/ai/appointment-optimization`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiBillingAnalysis: async (data) => {
    const res = await fetch(`${API_BASE}/ai/billing-analysis`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiContactLensRecommendation: async (data) => {
    const res = await fetch(`${API_BASE}/ai/contact-lens-recommendation`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiVisualAcuityAnalysis: async (data) => {
    const res = await fetch(`${API_BASE}/ai/visual-acuity-analysis`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },

  // Patient-specific AI endpoints
  aiPatientPrescription: async (patientId, data) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/ai-prescription`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiPatientFrameRecommend: async (patientId, data) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/ai-frame-recommend`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiPatientInsuranceBenefits: async (patientId, data) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/insurance-benefits`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiPatientEducation: async (patientId, data) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/education-content`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiPatientScheduleRecall: async (patientId, data) => {
    const res = await fetch(`${API_BASE}/patients/${patientId}/schedule-recall`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiDiagnose: async (data) => {
    const res = await fetch(`${API_BASE}/ai/diagnose`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiPatientRiskScore: async (data) => {
    const res = await fetch(`${API_BASE}/ai/patient-risk-score`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiScheduleOptimization: async (data) => {
    const res = await fetch(`${API_BASE}/ai/schedule-optimization`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiRecallImpactAssess: async (data) => {
    const res = await fetch(`${API_BASE}/ai/recall-impact-assess`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    return res.json();
  },
  aiFrameStyleSuggest: async (data) => {
    const res = await fetch(`${API_BASE}/ai/frame-style-suggest`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (res.status === 503) {
      return { error: 'AI service unavailable (OPENROUTER_API_KEY not configured)', status: 503 };
    }
    return res.json();
  },
  aiRxInteractionCheck: async (data) => {
    const res = await fetch(`${API_BASE}/ai/rx-interaction-check`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      return { error: 'AI service unavailable (OPENROUTER_API_KEY not configured)', status: 503, missing: body.missing };
    }
    return res.json();
  },
  aiAgenticPatientFollowup: async (data) => {
    const res = await fetch(`${API_BASE}/ai/agentic-patient-followup`, {
      method: 'POST', headers: getHeaders(), body: JSON.stringify(data),
    });
    if (res.status === 503) {
      const body = await res.json().catch(() => ({}));
      return { error: body.error || 'AI service unavailable', status: 503, missing: body.missing, analysis: body.analysis, result_json: body.result_json, dispatch: body.dispatch };
    }
    return res.json();
  },

  // Reports (non-AI)
  getDashboardStats: async () => {
    const res = await fetch(`${API_BASE}/reports/dashboard`, { headers: getHeaders() });
    return res.json();
  },
  getRevenueReport: async () => {
    const res = await fetch(`${API_BASE}/reports/revenue`, { headers: getHeaders() });
    return res.json();
  },
  getAppointmentStats: async () => {
    const res = await fetch(`${API_BASE}/reports/appointments-stats`, { headers: getHeaders() });
    return res.json();
  },
  getPatientDemographics: async () => {
    const res = await fetch(`${API_BASE}/reports/patient-demographics`, { headers: getHeaders() });
    return res.json();
  },
  getInventoryAlerts: async () => {
    const res = await fetch(`${API_BASE}/reports/inventory-alerts`, { headers: getHeaders() });
    return res.json();
  },

  // Recalls
  getOverdueRecalls: async () => {
    const res = await fetch(`${API_BASE}/recalls/overdue`, { headers: getHeaders() });
    return res.json();
  },
};
