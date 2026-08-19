/* ==========================================================================
   光之回响 (Echoes of Light) — 角色行程表查询模块
   数据源：data/schedules.json（手写行程表，静态数据，无 AI 开销）
   时段：morning 6-12 / afternoon 12-18 / evening 18-24 / night 0-6
   ========================================================================== */

import { CHARACTERS } from './scenes-data.js?v=29';

/** 行程表数据（data/schedules.json，构建期 fetch 后缓存） */
export var SCHEDULE_DATA = { periods: [], schedule: {}, cg: {} };

/** 时段 → 起始小时（按覆盖顺序判定用） */
var _periodStart = {};

/* ==========================================================================
   loadSchedules — 加载行程表（失败不阻塞，返回空）
   ========================================================================== */
export async function loadSchedules() {
  try {
    // ?v=29 版本号：数据 JSON 无 hash，改表后必须 bump 刷新浏览器缓存
    var resp = await fetch('data/schedules.json?v=29');
    if (resp.ok) {
      var data = await resp.json();
      SCHEDULE_DATA = data;
      _periodStart = {};
      (data.periods || []).forEach(function (p) { _periodStart[p.id] = p.start; });
    }
  } catch (e) {
    console.warn('[Schedules] schedules.json 加载失败，行程表为空');
  }
  return SCHEDULE_DATA;
}

/* ==========================================================================
   getPeriod — 小时 → 时段 id（night 跨 0 点，优先判定）
   ========================================================================== */
export function getPeriod(hour) {
  var h = ((hour % 24) + 24) % 24;
  if (h >= 18) return 'evening';
  if (h >= 12) return 'afternoon';
  if (h >= 6) return 'morning';
  return 'night';
}

/* ==========================================================================
   getPresent — 某场景当前时段在场角色列表
   ========================================================================== */
export function getPresent(sceneId, gameTime) {
  var period = getPeriod(gameTime && gameTime.hour != null ? gameTime.hour : 8);
  var result = [];
  var sched = SCHEDULE_DATA.schedule || {};
  Object.keys(sched).forEach(function (charId) {
    var entry = sched[charId] && sched[charId][period];
    if (entry && entry.scene === sceneId) {
      result.push({
        charId: charId,
        activity: entry.activity || '',
        spot: entry.spot || { x: 0.5, y: 0.55, scale: 0.85 }
      });
    }
  });
  return result;
}

/* ==========================================================================
   countPresent — 某场景当前时段在场人数（供「色色」分类判断）
   ========================================================================== */
export function countPresent(sceneId, gameTime) {
  return getPresent(sceneId, gameTime).length;
}

/* ==========================================================================
   getActivity — 角色当前时段行动文案（'塞壬 · 懒洋洋泡在鱼缸里打盹'）
   ========================================================================== */
export function getActivity(charId, gameTime) {
  var meta = CHARACTERS[charId];
  if (!meta) return null;
  var period = getPeriod(gameTime && gameTime.hour != null ? gameTime.hour : 8);
  var entry = SCHEDULE_DATA.schedule && SCHEDULE_DATA.schedule[charId]
    && SCHEDULE_DATA.schedule[charId][period];
  if (!entry) return meta.name + ' · 行踪不明';
  return meta.name + ' · ' + entry.activity;
}

/* ==========================================================================
   getCgPath — 角色 CG 路径（双子按时段切换白天/夜晚版：6-18 白天版，
   其余 0-6、18-24 夜晚版；无则 null）
   ========================================================================== */
export function getCgPath(charId, gameTime) {
  var cg = SCHEDULE_DATA.cg || {};
  var v = cg[charId];
  if (!v) return null;
  if (typeof v === 'string') return v;
  var hour = gameTime && gameTime.hour != null ? gameTime.hour : 8;
  return hour >= 6 && hour < 18 ? v.day : v.night;
}

/* ==========================================================================
   Node 校验环境预载 — 同步读取 schedules.json 填入 SCHEDULE_DATA
   （浏览器端由 loadSchedules() 异步 fetch；此处仅服务 node 校验脚本）
   ========================================================================== */
if (typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function') {
  try {
    var _fs = process.getBuiltinModule('node:fs');
    var _raw = _fs.readFileSync(new URL('../data/schedules.json', import.meta.url), 'utf8');
    var _data = JSON.parse(_raw);
    SCHEDULE_DATA = _data;
    _periodStart = {};
    (_data.periods || []).forEach(function (p) { _periodStart[p.id] = p.start; });
  } catch (e) {
    console.warn('[Schedules] Node 预载 schedules.json 失败：' + e.message);
  }
}
