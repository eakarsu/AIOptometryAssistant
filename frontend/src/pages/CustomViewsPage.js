// CustomViewsPage.js
// Combines EyeExamVisualizer + PrescriptionTimeline into the "Vision Analytics" page.
import React, { useState, useEffect } from 'react';
import EyeExamVisualizer from '../components/EyeExamVisualizer';
import PrescriptionTimeline from '../components/PrescriptionTimeline';
import RxPrintout from '../components/RxPrintout';
import ApptReminderDispatch from '../components/ApptReminderDispatch';

const authHeaders = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchJson(url) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
  if (!res.ok) throw new Error(`Request to ${url} failed: ${res.status}`);
  return res.json();
}

export default function CustomViewsPage() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [exam, setExam] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load patient list once for the selector
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/patients', { headers: { 'Content-Type': 'application/json', ...authHeaders() } });
        if (r.ok) {
          const list = await r.json();
          if (Array.isArray(list)) setPatients(list);
        }
      } catch (_) { /* non-fatal */ }
    })();
  }, []);

  // Fetch the two custom-views endpoints whenever patient changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = patientId ? `?patientId=${encodeURIComponent(patientId)}` : '';
        const [examRes, histRes] = await Promise.all([
          fetchJson(`/api/custom-views/eye-exam${qs}`),
          fetchJson(`/api/custom-views/rx-history${qs}`),
        ]);
        if (!cancelled) {
          setExam(examRes);
          setHistory(histRes);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [patientId]);

  return (
    <div data-testid="custom-views-page" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, color: '#0f172a' }}>Vision Analytics</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
            Eye-exam visualization and prescription history powered by bespoke endpoints.
          </p>
        </div>
        <div>
          <label style={{ fontSize: 12, color: '#475569', marginRight: 8 }}>Patient:</label>
          <select
            data-testid="patient-select"
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
          >
            <option value="">Auto (most exams)</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.id} — {p.first_name} {p.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div style={{ padding: 16, color: '#64748b' }}>Loading vision analytics…</div>}
      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 12, borderRadius: 8, marginBottom: 12 }}>
          {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <EyeExamVisualizer data={exam} />
        <PrescriptionTimeline data={history} />
        <RxPrintout />
        <ApptReminderDispatch />
      </div>
    </div>
  );
}
