// EyeExamVisualizer.js
// SVG eye-chart visualization showing patient's current Rx (sphere/cylinder/axis)
// with comparison to prior. Pure SVG — no third-party charting libs needed.
import React from 'react';

const fmt = (v) => {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '—';
  const n = Number(v);
  return (n > 0 ? '+' : '') + n.toFixed(2);
};

const fmtAxis = (v) => {
  if (v == null || v === '' || Number.isNaN(Number(v))) return '—';
  return `${Math.round(Number(v))}°`;
};

const ChartLetters = ({ scale = 1 }) => {
  // Snellen-like rows, sizes shrink as we go down
  const rows = [
    { letters: 'E', size: 60 },
    { letters: 'F P', size: 44 },
    { letters: 'T O Z', size: 32 },
    { letters: 'L P E D', size: 24 },
    { letters: 'P E C F D', size: 18 },
    { letters: 'E D F C Z P', size: 13 },
  ];
  let y = 38;
  return (
    <g>
      {rows.map((r, i) => {
        const fs = Math.max(8, r.size * scale);
        y += fs * 1.1;
        return (
          <text
            key={i}
            x="50%"
            y={y}
            textAnchor="middle"
            fontFamily="Courier, monospace"
            fontWeight="700"
            fontSize={fs}
            fill="#0f172a"
            letterSpacing={fs * 0.15}
          >
            {r.letters}
          </text>
        );
      })}
    </g>
  );
};

// Render an eye diagram: outer circle (cornea), pupil rotated by axis,
// cylinder bar showing astigmatism orientation.
const EyeDiagram = ({ label, sphere, cylinder, axis, color = '#0ea5e9' }) => {
  const cx = 110;
  const cy = 110;
  const r = 80;
  const pupilR = 22 + Math.min(20, Math.max(0, Math.abs(Number(sphere) || 0) * 4)); // size grows with |sphere|
  const cylLen = 18 + Math.min(60, Math.abs(Number(cylinder) || 0) * 25);
  const ax = Number(axis) || 0;

  return (
    <div style={{ textAlign: 'center', flex: 1, minWidth: 220 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#1e293b' }}>{label}</div>
      <svg viewBox="0 0 220 220" width="220" height="220" style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
        {/* eyeball */}
        <circle cx={cx} cy={cy} r={r} fill="#fff" stroke="#94a3b8" strokeWidth="2" />
        {/* iris */}
        <circle cx={cx} cy={cy} r={pupilR + 10} fill="#bae6fd" />
        {/* pupil */}
        <circle cx={cx} cy={cy} r={pupilR} fill={color} />
        {/* highlight */}
        <circle cx={cx - pupilR / 2} cy={cy - pupilR / 2} r={pupilR / 4} fill="#fff" opacity="0.6" />
        {/* cylinder axis bar */}
        <g transform={`rotate(${ax} ${cx} ${cy})`}>
          <line
            x1={cx - cylLen}
            y1={cy}
            x2={cx + cylLen}
            y2={cy}
            stroke="#ef4444"
            strokeWidth="3"
            strokeDasharray="6 3"
            opacity="0.85"
          />
          <text x={cx + cylLen + 4} y={cy + 4} fontSize="10" fill="#ef4444">cyl axis</text>
        </g>
        {/* compass for axis */}
        <text x={cx} y={cy - r - 4} textAnchor="middle" fontSize="9" fill="#64748b">90°</text>
        <text x={cx + r + 6} y={cy + 3} fontSize="9" fill="#64748b">0°/180°</text>
      </svg>
      <div style={{ marginTop: 8, fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
        <div>SPH: <strong style={{ color: '#0f172a' }}>{fmt(sphere)}</strong></div>
        <div>CYL: <strong style={{ color: '#0f172a' }}>{fmt(cylinder)}</strong></div>
        <div>AXIS: <strong style={{ color: '#0f172a' }}>{fmtAxis(axis)}</strong></div>
      </div>
    </div>
  );
};

const DeltaBadge = ({ label, value }) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) {
    return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: '#e2e8f0', color: '#475569', fontSize: 11, marginRight: 6 }}>{label}: 0.00</span>;
  }
  const positive = n > 0;
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 999,
      background: positive ? '#fee2e2' : '#dcfce7',
      color: positive ? '#991b1b' : '#166534',
      fontSize: 11, marginRight: 6, fontWeight: 600,
    }}>
      {label}: {positive ? '+' : ''}{n.toFixed(2)}
    </span>
  );
};

export default function EyeExamVisualizer({ data }) {
  if (!data || !data.current) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#64748b' }}>
        No eye-exam data yet.
      </div>
    );
  }

  const { patient, current, prior, delta, source } = data;
  const chartScale = 1 - Math.min(0.6, Math.abs(Number(current.right_sphere) || 0) * 0.08);

  return (
    <div data-testid="eye-exam-visualizer" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, color: '#0f172a' }}>Eye Exam Visualizer</h3>
          <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
            {patient ? `${patient.first_name || ''} ${patient.last_name || ''} (#${patient.id})` : 'Unknown patient'}
            {' · '}exam {current.exam_date || 'n/a'}
            {source === 'synthesized' && <span style={{ marginLeft: 8, color: '#b45309' }}>(synthesized)</span>}
          </div>
        </div>
        {delta && (
          <div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Change vs prior ({prior?.exam_date || 'n/a'})</div>
            <DeltaBadge label="OD SPH" value={delta.right_sphere} />
            <DeltaBadge label="OD CYL" value={delta.right_cylinder} />
            <DeltaBadge label="OS SPH" value={delta.left_sphere} />
            <DeltaBadge label="OS CYL" value={delta.left_cylinder} />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
        <EyeDiagram
          label="Right eye (OD)"
          sphere={current.right_sphere}
          cylinder={current.right_cylinder}
          axis={current.right_axis}
          color="#0ea5e9"
        />
        <EyeDiagram
          label="Left eye (OS)"
          sphere={current.left_sphere}
          cylinder={current.left_cylinder}
          axis={current.left_axis}
          color="#8b5cf6"
        />
      </div>

      <div style={{ marginTop: 18 }}>
        <div style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>
          Simulated acuity preview (chart legibility scales with current OD sphere)
        </div>
        <svg viewBox="0 0 600 280" width="100%" height="260" style={{ background: '#fff', border: '1px dashed #cbd5e1', borderRadius: 8 }}>
          <ChartLetters scale={chartScale} />
        </svg>
      </div>
    </div>
  );
}
