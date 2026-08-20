// 校验场景数据完整性：node scripts/validate-scenes.mjs
import { SCENES, CHARACTERS, EMOTION_LIST, getScene, emotionFile, avatarAnchor } from '../js/scenes-data.js';

let errors = [];
const ids = Object.keys(SCENES);
if (ids.length !== 19) errors.push(`场景数应为 19，实际 ${ids.length}`);

// 场景集合：必须恰为新 19 场景（公司 3 场景已删除，新增 twins_room/church/forest/balcony/winda_room/riverside）
const WANT_SCENES = ['home_living', 'home_bed', 'home_door', 'twins_room',
  'food_bunshop', 'food_st', 'market_hall', 'market_door',
  'cardshop_inside', 'cardshop_door', 'mall_st', 'mall_dessert',
  'church', 'forest', 'suburb_st', 'suburb_station',
  'balcony', 'winda_room', 'riverside'];
for (const sid of WANT_SCENES) {
  if (!SCENES[sid]) errors.push(`缺少场景 ${sid}`);
}
if (ids.length !== WANT_SCENES.length) {
  const extra = ids.filter(x => !WANT_SCENES.includes(x));
  errors.push(`场景数应为 ${WANT_SCENES.length}，实际 ${ids.length}${extra.length ? `（多余: ${extra.join(', ')}）` : ''}`);
}

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
// roster：必须恰为世界书 11 人
const WANT_CHARS = ['siren', 'lingyi', 'lushi', 'kisikil', 'lilla', 'ecclesia', 'tiantong', 'li', 'caihong', 'sera', 'winda'];
for (const cid of WANT_CHARS) {
  if (!CHARACTERS[cid]) errors.push(`CHARACTERS 缺少角色 ${cid}`);
}
if (Object.keys(CHARACTERS).length !== WANT_CHARS.length) {
  errors.push(`CHARACTERS 角色数应为 ${WANT_CHARS.length}，实际 ${Object.keys(CHARACTERS).length}`);
}
// CHARACTERS 字段：portrait 路径合法 + fullbody 已删除
for (const [cid, meta] of Object.entries(CHARACTERS)) {
  const want = `assets/characters/${cid}/neutral.png`;
  if (!meta.portrait || meta.portrait !== want) errors.push(`${cid}: portrait 应为 ${want}`);
  if ('fullbody' in meta) errors.push(`${cid}: fullbody 字段应已删除`);
}
// avatarAnchor 纯函数：站位上抬 12%，y 下界夹 0
const anchor = avatarAnchor({ x: 0.5, y: 0.5, scale: 0.8 });
if (anchor.x !== 0.5 || Math.abs(anchor.y - 0.38) > 1e-9) errors.push(`avatarAnchor 计算错误: ${JSON.stringify(anchor)}`);
const anchorLow = avatarAnchor({ x: 0.3, y: 0.05 });
if (anchorLow.y !== 0) errors.push(`avatarAnchor 应夹到 0: ${JSON.stringify(anchorLow)}`);
if (EMOTION_LIST.length !== 8) errors.push('表情数应为 8');
for (const e of EMOTION_LIST) {
  const f = emotionFile('siren', e);
  if (!f.endsWith(`/siren/${e}.png`)) errors.push(`emotionFile 路径错误: ${f}`);
}
if (!getScene('home_living') || getScene('nonexistent')) errors.push('getScene 行为错误');

// 连通性：从 home_living 出发 BFS，断言 18 节点全可达
const reachable = new Set(['home_living']);
const queue = ['home_living'];
while (queue.length) {
  const cur = queue.shift();
  for (const e of SCENES[cur].exits) {
    if (!reachable.has(e.to)) {
      reachable.add(e.to);
      queue.push(e.to);
    }
  }
}
if (reachable.size !== ids.length) {
  const unreachable = ids.filter(id => !reachable.has(id));
  errors.push(`不可达场景: ${unreachable.join(', ')}`);
}

if (errors.length) {
  console.error('FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`PASS: ${WANT_SCENES.length} 场景（新集合）、出口引用、角色/物件坐标、表情路径全部有效、${WANT_SCENES.length} 节点全连通`);
