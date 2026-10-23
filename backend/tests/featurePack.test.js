import test from 'node:test';
import assert from 'node:assert/strict';
process.env.JWT_SECRET = (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32) ? process.env.JWT_SECRET : 'test-secret-test-secret-test-secret-1234';
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
import express from 'express';
import jwt from 'jsonwebtoken';
import router, { sections } from '../src/routes/featurePack.js';
test('feature-pack optometry: auth, tasks/search/export, operational AI fallback (no diagnosis)', async () => {
  delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
  assert.deepEqual(sections([['Done', false], ['Count', 0], ['Note', '']]).map(s => s.value), [false, 0, '']);
  const app = express(); app.use(express.json()); app.use('/api/feature-pack', router);
  const srv = app.listen(0); await new Promise(r => srv.once('listening', r));
  const base = `http://127.0.0.1:${srv.address().port}/api/feature-pack`;
  const H = { Authorization: `Bearer ${jwt.sign({ id: 7 }, process.env.JWT_SECRET)}`, 'Content-Type': 'application/json' };
  try {
    assert.equal((await fetch(`${base}/tasks`)).status, 401);
    const c = await fetch(`${base}/tasks`, { method: 'POST', headers: H, body: JSON.stringify({ title: 'Alpha recall task', priority: 'high', category: 'recall', estimateHours: 0, done: false }) });
    assert.equal(c.status, 201); const task = await c.json(); assert.equal(task.done, false);
    assert.equal((await (await fetch(`${base}/tasks?q=Alpha`, { headers: H })).json()).total, 1);
    assert.equal((await (await fetch(`${base}/tasks?q=nothing-here`, { headers: H })).json()).total, 0);
    const upd = await (await fetch(`${base}/tasks/${task.id}`, { method: 'PUT', headers: H, body: JSON.stringify({ status: 'done', done: true }) })).json();
    assert.equal(upd.done, true);
    assert.ok((await (await fetch(`${base}/tasks/export?format=csv`, { headers: H })).text()).includes('Alpha recall task'));
    assert.equal((await (await fetch(`${base}/tasks/export?format=json`, { headers: H })).json()).total, 1);
    const ai = await (await fetch(`${base}/ai/recall-operations-summary`, { method: 'POST', headers: H, body: '{}' })).json();
    assert.equal(ai.aiGenerated, false); assert.match(ai.disclaimer, /not a diagnosis/i);
    assert.ok(ai.sections.length >= 2 && ai.sections.every(s => 'label' in s && 'value' in s));
  } finally { srv.close(); }
});
