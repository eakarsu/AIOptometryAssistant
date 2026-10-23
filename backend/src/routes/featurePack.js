// Feature pack (operational only — no diagnosis or clinical claims):
// authenticated tasks + search/filter + CSV/JSON export + operational AI
// summaries over the caller's own tasks. In-memory store (no DB migration).
// Provider only when OPENROUTER_API_KEY or OPENAI_API_KEY is set; otherwise
// deterministic fallback with aiGenerated:false. Sections preserve false/0/''.
import express from 'express';
import { randomUUID } from 'crypto';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const tasks = new Map();
const ownerOf = (req) => String((req.user && (req.user.id ?? req.user.userId ?? req.user.email)) ?? 'unknown');
const ownTasks = (req) => [...tasks.values()].filter(t => t.ownerId === ownerOf(req));
export function filterTasks(list, q = {}) {
  let out = [...list];
  const s = (q.q ?? q.search ?? '').toString().trim().toLowerCase();
  if (s) out = out.filter(t => [t.title, t.description, t.status, t.priority, t.category].filter(v => v != null).join(' ').toLowerCase().includes(s));
  if (q.status) out = out.filter(t => String(t.status) === String(q.status));
  if (q.priority) out = out.filter(t => String(t.priority) === String(q.priority));
  if (q.category) out = out.filter(t => String(t.category ?? '') === String(q.category));
  return out;
}
const esc = (v) => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export function toCsv(rows) { const cols = ['id','title','description','status','priority','category','estimateHours','done','ownerId','createdAt','updatedAt']; return [cols.join(','), ...rows.map(r => cols.map(c => esc(r[c])).join(','))].join('\n') + '\n'; }
export const sections = (pairs) => pairs.map(([label, value]) => ({ label, value: value === undefined ? '' : value }));
async function maybeProvider(prompt) {
  const key = process.env.OPENROUTER_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;
  try {
    const isOR = Boolean(process.env.OPENROUTER_API_KEY);
    const r = await fetch(isOR ? 'https://openrouter.ai/api/v1/chat/completions' : 'https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: process.env.OPENROUTER_MODEL || process.env.OPENAI_MODEL || (isOR ? 'openai/gpt-4o-mini' : 'gpt-4o-mini'), messages: [{ role: 'user', content: prompt }] }) });
    if (!r.ok) return null;
    const j = await r.json(); const text = j?.choices?.[0]?.message?.content;
    return typeof text === 'string' && text ? text : null;
  } catch { return null; }
}
async function aiRespond(res, feature, prompt, fallback) {
  const text = await maybeProvider(prompt);
  if (text) return res.json({ feature, aiGenerated: true, provider: process.env.OPENROUTER_API_KEY ? 'openrouter' : 'openai', disclaimer: 'Operational summary only — not a diagnosis or clinical recommendation.', sections: sections([['Summary', text]]), text });
  return res.json({ feature, aiGenerated: false, provider: null, note: 'Deterministic fallback — no AI provider key configured.', disclaimer: 'Operational summary only — not a diagnosis or clinical recommendation.', sections: fallback });
}
router.use(authenticateToken);
router.get('/tasks', (req, res) => { const items = filterTasks(ownTasks(req), req.query); res.json({ total: items.length, items }); });
router.post('/tasks', (req, res) => {
  const b = req.body || {};
  if (!b.title || !String(b.title).trim()) return res.status(400).json({ error: 'title is required' });
  const now = new Date().toISOString();
  const task = { id: randomUUID(), title: String(b.title), description: b.description ?? '', status: b.status ?? 'open', priority: b.priority ?? 'medium', category: b.category ?? '', estimateHours: b.estimateHours ?? 0, done: b.done ?? false, ownerId: ownerOf(req), createdAt: now, updatedAt: now };
  tasks.set(task.id, task); res.status(201).json(task);
});
const update = (req, res) => { const t = tasks.get(req.params.id); if (!t || t.ownerId !== ownerOf(req)) return res.status(404).json({ error: 'Task not found' }); const b = req.body || {}; for (const k of ['title','description','status','priority','category','estimateHours','done']) if (Object.prototype.hasOwnProperty.call(b, k)) t[k] = b[k]; t.updatedAt = new Date().toISOString(); res.json(t); };
router.put('/tasks/:id', update); router.patch('/tasks/:id', update);
router.get('/tasks/export', (req, res) => {
  const items = filterTasks(ownTasks(req), req.query); const fmt = String(req.query.format || 'json').toLowerCase();
  if (fmt === 'csv') { res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', 'attachment; filename="tasks.csv"'); return res.send(toCsv(items)); }
  if (fmt === 'json') { res.setHeader('Content-Disposition', 'attachment; filename="tasks.json"'); return res.json({ total: items.length, items }); }
  return res.status(400).json({ error: 'format must be csv or json' });
});
router.post('/ai/appointment-ops-summary', async (req, res) => { const items = ownTasks(req); await aiRespond(res, 'appointment-ops-summary', 'Appointment operations summary over: ' + JSON.stringify(items), sections([['Open tasks', items.filter(t=>t.status!=='done').length],['Blocked tasks', items.filter(t=>t.status==='blocked').map(t=>t.title)],['Any done', items.some(t=>t.done===true)]])); });
router.post('/ai/recall-operations-summary', async (req, res) => { const items = ownTasks(req); await aiRespond(res, 'recall-operations-summary', 'Recall operations summary over: ' + JSON.stringify(items), sections([['Recall tasks', items.filter(t=>String(t.category).toLowerCase().includes('recall')).map(t=>t.title)],['Recall count', items.filter(t=>String(t.category).toLowerCase().includes('recall')).length],['Done count', items.filter(t=>t.done===true).length]])); });
router.post('/ai/inventory-ops-summary', async (req, res) => { const items = ownTasks(req); await aiRespond(res, 'inventory-ops-summary', 'Inventory operations summary over: ' + JSON.stringify(items), sections([['Inventory tasks', items.filter(t=>String(t.category).toLowerCase().includes('inventory')).map(t=>t.title)],['Total estimate hours', items.reduce((s,t)=>s+(Number(t.estimateHours)||0),0)],['Completion ratio', items.length ? items.filter(t=>t.done===true).length/items.length : 0]])); });
export default router;
