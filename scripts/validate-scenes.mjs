// 校验场景数据完整性：node scripts/validate-scenes.mjs
import { SCENES, CHARACTERS, EMOTION_LIST, getScene, emotionFile } from '../js/scenes-data.js';

let errors = [];
const ids = Object.keys(SCENES);
if (ids.length !== 16) errors.push(`场景数应为 16，实际 ${ids.length}`);

for (const [id, s] of Object.entries(SCENES)) {
  if (s.id !== id) errors.push(`${id}: id 字段不一致`);
  if (!s.bg || !s.bg.startsWith('assets/scenes/')) errors.push(`${id}: bg 路径非法`);
  if (!s.name || !s.description) errors.push(`${id}: 缺 name/description`);
  for (const e of s.exits) {
    if (!['left', 'right', 'top', 'bottom'].includes(e.dir)) errors.push(`${id}: 非法出口方向 ${e.dir}`);
    if (!SCENES[e.to]) errors.push(`${id}: 出口指向不存在的场景 ${e.to}`);
  }
  for (const c of s.characters) {
    if (!CHARACTERS[c]) errors.push(`${id}: 角色 ${c} 不在 CHARACTERS`);
  }
  for (const [c, spot] of Object.entries(s.characterSpots)) {
    if (!s.characters.includes(c)) errors.push(`${id}: characterSpots 有未声明角色 ${c}`);
    for (const k of ['x', 'y']) {
      if (typeof spot[k] !== 'number' || spot[k] < 0 || spot[k] > 1) errors.push(`${id}: ${c}.${k} 越界`);
    }
  }
  for (const o of s.objects) {
    if (o.x < 0 || o.x > 1 || o.y < 0 || o.y > 1) errors.push(`${id}: 物件 ${o.id} 坐标越界`);
  }
}
if (EMOTION_LIST.length !== 8) errors.push('表情数应为 8');
for (const e of EMOTION_LIST) {
  const f = emotionFile('liuyue', e);
  if (!f.endsWith(`/liuyue/${e}.png`)) errors.push(`emotionFile 路径错误: ${f}`);
}
if (!getScene('home_living') || getScene('nonexistent')) errors.push('getScene 行为错误');

if (errors.length) {
  console.error('FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('PASS: 16 场景、出口引用、角色/物件坐标、表情路径全部有效');
