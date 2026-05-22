// ApptReminderDispatch.js
// Multi-select upcoming appointments + "Send Reminders" button.
// Shows a running log of dispatch batches (sent/failed/sids).
import React, { useEffect, useState } from 'react';

const authHeaders = () => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

async function fetchJson(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...authHeaders(), ...(opts.headers || {}) },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.json();
}

export default function ApptReminderDispatch() {
  const [appts, setAppts] = useState([]);
  const [selected, setSelected] = useState({});
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [lastResult, setLastResult] = useState(null);

  const loadAppts = async () => {
    setLoading(true);
    setError(null);
    try {
      const j = await fetchJson('/api/custom-views/upcoming-appointments');
      setAppts(j.data || []);
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  const loadLog = async () => {
    try {
      const j = await fetchJson('/api/custom-views/reminder-log');
      setLog(j.data || []);
    } catch (_) { /* non-fatal */ }
  };

  useEffect(() => { loadAppts(); loadLog(); }, []);

  const toggle = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const selectAll = () => {
    const next = {};
    appts.forEach((a) => { next[a.id] = true; });
    setSelected(next);
  };
  const clearAll = () => setSelected({});

  const handleSend = async () => {
    setSending(true);
    setError(null);
    setLastResult(null);
    try {
      const ids = Object.entries(selected).filter(([, v]) => v).map(([k]) => Number(k));
      const j = await fetchJson('/api/custom-views/send-reminders', {
        method: 'POST',
        body: JSON.stringify({ appointment_ids: ids }),
      });
      setLastResult(j);
      await loadLog();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setSending(false);
    }
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div
      data-testid="appt-reminder-dispatch"
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: 14,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Appointment Reminder Dispatch</h3>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            Select upcoming appointments and dispatch SMS reminders (stubbed provider — no real SMS sent).
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            data-testid="appt-select-all"
            onClick={selectAll}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            Select all
          </button>
          <button
            data-testid="appt-clear-all"
            onClick={clearAll}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 12, cursor: 'pointer' }}
          >
            Clear
          </button>
          <button
            data-testid="appt-send-reminders"
            onClick={handleSend}
            disabled={sending}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: 'none',
              background: sending ? '#94a3b8' : '#16a34a',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: sending ? 'wait' : 'pointer',
            }}
          >
            {sending ? 'Dispatching…' : `Send Reminders${selectedCount ? ` (${selectedCount})` : ''}`}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', color: '#991b1b', padding: 10, borderRadius: 8, marginTop: 12, fontSize: 13 }}>
          {error}
        </div>
      )}

      {/* Appointments table */}
      <div style={{ marginTop: 16, overflow: 'auto', border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 280 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead style={{ background: '#f1f5f9' }}>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: 36 }}></th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>Patient</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>Phone</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>When</th>
              <th style={{ textAlign: 'left', padding: '8px 10px', borderBottom: '1px solid #e2e8f0' }}>Type</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={5} style={{ padding: 12, color: '#64748b', textAlign: 'center' }}>Loading appointments…</td></tr>
            )}
            {!loading && appts.length === 0 && (
              <tr><td colSpan={5} style={{ padding: 12, color: '#64748b', textAlign: 'center' }}>No upcoming appointments.</td></tr>
            )}
            {appts.map((a) => {
              const dateStr = a.appointment_date ? String(a.appointment_date).slice(0, 10) : '';
              return (
                <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '6px 10px' }}>
                    <input
                      type="checkbox"
                      data-testid={`appt-check-${a.id}`}
                      checked={!!selected[a.id]}
                      onChange={() => toggle(a.id)}
                    />
                  </td>
                  <td style={{ padding: '6px 10px', color: '#0f172a' }}>
                    {a.first_name || ''} {a.last_name || ''} <span style={{ color: '#94a3b8' }}>#{a.id}</span>
                  </td>
                  <td style={{ padding: '6px 10px', color: '#475569' }}>{a.phone || '—'}</td>
                  <td style={{ padding: '6px 10px', color: '#475569' }}>{dateStr} {a.appointment_time || ''}</td>
                  <td style={{ padding: '6px 10px', color: '#475569' }}>{a.appointment_type || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Last batch result */}
      {lastResult && (
        <div style={{ marginTop: 14, padding: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 10 }}>
          <div style={{ fontSize: 13, color: '#065f46', fontWeight: 600 }}>
            Dispatched: {lastResult.sent} sent · {lastResult.failed} failed
          </div>
          {Array.isArray(lastResult.sids) && lastResult.sids.length > 0 && (
            <div style={{ marginTop: 6, fontSize: 11, color: '#047857', wordBreak: 'break-all' }}>
              SIDs: {lastResult.sids.join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Dispatch log */}
      <div style={{ marginTop: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0, fontSize: 14, color: '#0f172a' }}>Dispatch Log</h4>
          <button
            data-testid="reminder-log-refresh"
            onClick={loadLog}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', fontSize: 11, cursor: 'pointer' }}
          >
            Refresh
          </button>
        </div>
        <div data-testid="reminder-log" style={{ marginTop: 8, maxHeight: 240, overflow: 'auto' }}>
          {log.length === 0 && (
            <div style={{ padding: 12, color: '#64748b', fontSize: 13, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
              No dispatches yet.
            </div>
          )}
          {log.map((batch) => (
            <div key={batch.batch_id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 8, padding: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#475569' }}>
                <strong style={{ color: '#0f172a' }}>{batch.batch_id}</strong>
                <span>{new Date(batch.dispatched_at).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12, color: '#0f172a', marginTop: 4 }}>
                {batch.sent} sent · {batch.failed} failed · {batch.records?.length || 0} records
              </div>
              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12, color: '#0ea5e9' }}>View records</summary>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 6 }}>
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Patient</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Phone</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '4px 6px' }}>SID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(batch.records || []).map((r, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '4px 6px' }}>{r.patient}</td>
                        <td style={{ padding: '4px 6px', color: '#475569' }}>{r.phone}</td>
                        <td style={{ padding: '4px 6px', color: r.status === 'sent' ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{r.status}</td>
                        <td style={{ padding: '4px 6px', color: '#64748b', wordBreak: 'break-all' }}>{r.sid || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
