// node scripts/validate-state.mjs
// 通过静态文本校验 state.js/storage.js 的字段契约
import { readFileSync } from 'node:fs';
const state = readFileSync('js/state.js', 'utf-8');
const storage = readFileSync('js/storage.js', 'utf-8');
let errors = [];
for (const needle of ["currentSceneId: 'home_living'", 'sceneCharacters: {', 'closeup: { active: false']) {
  if (!state.includes(needle)) errors.push(`state.js 缺少: ${needle}`);
}
for (const needle of ["'currentSceneId'", "'sceneCharacters'", "'gameTime'"]) {
  if (!storage.includes(needle)) errors.push(`storage.js SAVE_KEYS 缺少: ${needle}`);
}
if (storage.includes("'closeup'")) errors.push('closeup 不应入存档');
if (errors.length) { console.error('FAIL'); errors.forEach(e => console.error(' -', e)); process.exit(1); }
console.log('PASS: 状态字段与存档白名单契约正确');
