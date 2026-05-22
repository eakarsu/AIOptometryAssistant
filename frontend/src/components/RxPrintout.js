// RxPrintout.js
// Patient picker + "Print Rx" button that downloads a backend-generated PDF
// of the formal eyeglass prescription.
import React, { useEffect, useState } from 'react';

const authHeaders = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function RxPrintout() {
  const [patients, setPatients] = useState([]);
  const [patientId, setPatientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastPdfUrl, setLastPdfUrl] = useState(null);
  const [lastInfo, setLastInfo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/patients', {
          headers: { 'Content-Type': 'application/json', ...authHeaders() },
        });
        if (r.ok) {
          const list = await r.json();
          if (Array.isArray(list)) setPatients(list);
        }
      } catch (_) { /* non-fatal */ }
    })();
  }, []);

  // Revoke object URLs we create to avoid memory leaks
  useEffect(() => {
    return () => {
      if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
    };
  }, [lastPdfUrl]);

  const handlePrint = async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = patientId ? `?patient_id=${encodeURIComponent(patientId)}` : '';
      const res = await fetch(`/api/custom-views/print-rx${qs}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/pdf', ...authHeaders() },
        body: JSON.stringify({ patient_id: patientId || null }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Print Rx failed: ${res.status} ${text}`);
      }
      const blob = await res.blob();
      if (lastPdfUrl) URL.revokeObjectURL(lastPdfUrl);
      const url = URL.createObjectURL(blob);
      setLastPdfUrl(url);
      const chosen = patients.find((p) => String(p.id) === String(patientId));
      setLastInfo({
        patientLabel: chosen ? `#${chosen.id} ${chosen.first_name} ${chosen.last_name}` : (patientId ? `Patient #${patientId}` : 'Auto-selected patient'),
        generatedAt: new Date().toLocaleString(),
        sizeKb: Math.round(blob.size / 102.4) / 10,
      });
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      data-testid="rx-printout"
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Rx Printout (PDF)</h3>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Generate a formal eyeglass prescription PDF (OD/OS sphere, cylinder, axis · prescriber signature line · valid-until date).
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 16, flexWrap: 'wrap' }}>
        <label style={{ fontSize: 12, color: '#475569' }}>Patient:</label>
        <select
          data-testid="rx-patient-select"
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, minWidth: 220 }}
        >
          <option value="">Auto (most exams)</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.id} — {p.first_name} {p.last_name}
            </option>
          ))}
        </select>
        <button
          data-testid="rx-print-button"
          onClick={handlePrint}
          disabled={loading}
          style={{
            padding: '8px 14px',
            borderRadius: 8,
            border: 'none',
            background: loading ? '#94a3b8' : '#0ea5e9',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
          }}
        >
          {loading ? 'Generating…' : 'Print Rx'}
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginTop: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {lastPdfUrl && lastInfo && (
        <div style={{ marginTop: 16, padding: 12, background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: '#0c4a6e', marginBottom: 8 }}>
            <strong>PDF ready</strong> · {lastInfo.patientLabel} · {lastInfo.sizeKb} KB · generated {lastInfo.generatedAt}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a
              href={lastPdfUrl}
              target="_blank"
              rel="noreferrer"
              style={{ padding: '6px 12px', borderRadius: 6, background: '#0284c7', color: '#fff', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
            >
              Open PDF
            </a>
            <a
              href={lastPdfUrl}
              download={`rx_${patientId || 'auto'}.pdf`}
              style={{ padding: '6px 12px', borderRadius: 6, background: '#fff', color: '#0284c7', border: '1px solid #0284c7', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
            >
              Download
            </a>
          </div>
          <iframe
            title="Rx PDF preview"
            src={lastPdfUrl}
            style={{ width: '100%', height: 380, border: '1px solid #cbd5e1', borderRadius: 8, marginTop: 10, background: '#fff' }}
          />
        </div>
      )}
    </div>
  );
}
