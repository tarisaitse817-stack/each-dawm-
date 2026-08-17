// 校验图鉴数据完整性：node scripts/validate-characters.mjs
import fs from 'node:fs';

const errors = [];
const raw = fs.readFileSync(new URL('../data/characters.json', import.meta.url), 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('FAIL: characters.json 解析失败:', e.message);
  process.exit(1);
}

const WANT = [
  ['siren', 40], ['lingyi', 30], ['lushi', 30], ['kisikil', 20], ['lilla', 20],
  ['ecclesia', 20], ['tiantong', 30], ['li', 20], ['caihong', 20]
];

const chars = data.characters;
if (!Array.isArray(chars)) errors.push('characters 应为数组');
else {
  const ids = chars.map(c => c.id);
  if (new Set(ids).size !== ids.length) errors.push('id 重复');
  if (chars.length !== WANT.length) errors.push(`角色数应为 ${WANT.length}，实际 ${chars.length}`);
  for (const [id, aff] of WANT) {
    const c = chars.find(x => x.id === id);
    if (!c) { errors.push(`缺少角色 ${id}`); continue; }
    if (c.name !== null && !c.name) errors.push(`${id}: 缺 name`);
    if (!Array.isArray(c.nicknames) || c.nicknames.length === 0) errors.push(`${id}: nicknames 应非空数组`);
    if (!Array.isArray(c.identities) || c.identities.length === 0) errors.push(`${id}: identities 应非空数组`);
    for (const f of ['background', 'personality', 'appearance']) {
      if (typeof c[f] !== 'string' || c[f].trim().length < 10) errors.push(`${id}: ${f} 文案过短`);
    }
    if (c.affection !== aff) errors.push(`${id}: 初始好感应为 ${aff}，实际 ${c.affection}`);
    if (!c.theme || !c.theme.glow || !c.theme.accent) errors.push(`${id}: theme 缺 glow/accent`);
    if (!c.introImage || !c.introImage.startsWith('assets/companions/')) errors.push(`${id}: introImage 路径非法`);
    if (!c.avatar || !c.avatar.startsWith('assets/companions/')) errors.push(`${id}: avatar 路径非法`);
    for (const f of ['background', 'personality', 'appearance']) {
      if (/NSFW|淫|肏|肉棒|小穴|高潮|发情/i.test(c[f])) errors.push(`${id}: ${f} 含 NSFW 内容`);
    }
  }
  const twins = ['kisikil', 'lilla'];
  for (const id of twins) {
    const c = chars.find(x => x.id === id);
    if (c && c.introImage !== 'assets/companions/twins-intro.png') errors.push(`${id}: introImage 应指向 twins-intro.png`);
  }
}

if (errors.length) {
  console.error('FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log(`PASS: ${chars.length} 角色图鉴数据完整、初始好感与文案合规`);
