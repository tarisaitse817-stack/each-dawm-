// 校验行程表数据完整性：node scripts/validate-schedules.mjs
import fs from 'node:fs';
import { SCENES } from '../js/scenes-data.js';
import { SCHEDULE_DATA, getPeriod, getPresent, getActivity, getCgPath } from '../js/schedules.js';

const errors = [];
const PERIODS = ['morning', 'afternoon', 'evening', 'night'];
const WANT_CHARS = ['siren', 'lingyi', 'lushi', 'kisikil', 'lilla', 'ecclesia', 'tiantong', 'li', 'caihong'];

const sched = SCHEDULE_DATA.schedule || {};
if (Object.keys(sched).length !== WANT_CHARS.length) errors.push(`行程表角色数应为 ${WANT_CHARS.length}，实际 ${Object.keys(sched).length}`);
for (const cid of WANT_CHARS) {
  if (!sched[cid]) { errors.push(`行程表缺少角色 ${cid}`); continue; }
  for (const p of PERIODS) {
    if (!(p in sched[cid])) { errors.push(`${cid}: 缺时段 ${p}`); continue; }
    const e = sched[cid][p];
    if (e === null) continue; // 不在场合法
    if (!SCENES[e.scene]) { errors.push(`${cid}/${p}: 场景 ${e.scene} 不存在`); continue; }
    if (!e.activity || !e.activity.trim()) errors.push(`${cid}/${p}: 行动文案为空`);
    for (const k of ['x', 'y']) {
      if (typeof e.spot?.[k] !== 'number' || e.spot[k] < 0 || e.spot[k] > 1) errors.push(`${cid}/${p}: spot.${k} 非法`);
    }
  }
}
// CG 表：key 合法，值 string 或 {day,night}，路径格式 assets/characters/
const cg = SCHEDULE_DATA.cg || {};
for (const [cid, v] of Object.entries(cg)) {
  if (!WANT_CHARS.includes(cid)) errors.push(`cg 表有未知角色 ${cid}`);
  const okStr = s => typeof s === 'string' && s.startsWith('assets/characters/');
  const okObj = o => o && typeof o === 'object' && okStr(o.day) && okStr(o.night);
  if (!okStr(v) && !okObj(v)) errors.push(`${cid}: cg 路径非法`);
}
if (!cg.ecclesia || typeof cg.ecclesia !== 'string' || !cg.ecclesia.startsWith('assets/characters/')) errors.push('ecclesia 缺 cg 条目（应为 assets/characters/ecclesia/cg/start.png）');
// getPeriod：全天覆盖 + 边界正确
if (getPeriod(0) !== 'night' || getPeriod(5) !== 'night') errors.push('getPeriod 深夜边界错误');
if (getPeriod(6) !== 'morning' || getPeriod(11) !== 'morning') errors.push('getPeriod 上午边界错误');
if (getPeriod(12) !== 'afternoon' || getPeriod(17) !== 'afternoon') errors.push('getPeriod 下午边界错误');
if (getPeriod(18) !== 'evening' || getPeriod(23) !== 'evening') errors.push('getPeriod 晚上边界错误');
// 查询函数冒烟：上午客厅 4 人（塞壬/零依/天童/彩虹）；深夜双子不在任何场景
const tMorning = { day: 1, hour: 9, minute: 0 };
const tNight = { day: 1, hour: 1, minute: 0 };
const livingIds = getPresent('home_living', tMorning).map(x => x.charId);
for (const cid of ['siren', 'lingyi', 'tiantong', 'caihong']) {
  if (!livingIds.includes(cid)) errors.push(`上午客厅应含 ${cid}`);
}
const allScenes = Object.values(SCENES);
for (const cid of ['kisikil', 'lilla']) {
  for (const s of allScenes) {
    if (getPresent(s.id, tNight).some(x => x.charId === cid)) errors.push(`深夜 ${cid} 不应在 ${s.id}`);
  }
}
if (getCgPath('siren', tMorning) !== 'assets/characters/siren/cg/start.png') errors.push('塞壬 CG 路径错误');
if (getCgPath('kisikil', tMorning) !== 'assets/characters/twins/cg/start-day.png') errors.push('双子白天 CG 路径错误');
if (getCgPath('kisikil', tNight) !== 'assets/characters/twins/cg/start-night.png') errors.push('双子夜晚 CG 路径错误');
if (getCgPath('ecclesia', tMorning) !== 'assets/characters/ecclesia/cg/start.png') errors.push('艾克利西亚 CG 路径错误');

if (errors.length) {
  console.error('FAIL');
  for (const e of errors) console.error(' -', e);
  process.exit(1);
}
console.log('PASS: 行程表 9 角色 × 4 时段完整、场景/坐标/文案合规、CG 路径与时段切换正确');
