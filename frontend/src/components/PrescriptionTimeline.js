// PrescriptionTimeline.js
// Recharts multi-line chart of Rx values (sphere & cylinder, per eye) over time.
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

export default function PrescriptionTimeline({ data }) {
  if (!data || !Array.isArray(data.series) || data.series.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
        No prescription history available.
      </div>
    );
  }

  const { patient, series, source } = data;

  return (
    <div data-testid="prescription-timeline" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Prescription History Timeline</h3>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
          {patient ? `${patient.first_name || ''} ${patient.last_name || ''} (#${patient.id})` : 'Unknown patient'}
          {' · '}{series.length} exams
          {source === 'synthesized' && <span style={{ marginLeft: 8, color: '#b45309' }}>(synthesized)</span>}
        </div>
      </div>

      <div style={{ width: '100%', height: 360 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#475569' }} />
            <YAxis
              tick={{ fontSize: 11, fill: '#475569' }}
              label={{ value: 'Diopters', angle: -90, position: 'insideLeft', fill: '#475569', fontSize: 12 }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }}
              formatter={(value) => (value == null ? '—' : Number(value).toFixed(2))}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="right_sphere"
              name="OD Sphere"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="right_cylinder"
              name="OD Cylinder"
              stroke="#0284c7"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="left_sphere"
              name="OS Sphere"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="left_cylinder"
              name="OS Cylinder"
              stroke="#7c3aed"
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={{ r: 3 }}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
