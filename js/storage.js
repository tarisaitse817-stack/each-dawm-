/* ==========================================================================
   光之回响 (Echoes of Light) — StorageManager localStorage 持久化
   ========================================================================== */

import { DEFAULT_COMPANION_IDS, getDefaultCompanions } from './state.js?v=25';
import { SCENES } from './scenes-data.js?v=25';

/** localStorage 存储键名 */
const STORAGE_KEY = 'light-echoes-save';

/** 需要持久化的顶层状态键列表（不含运行时/会话状态） */
const SAVE_KEYS = [
  'player',
  'gamePhase',
  'companions',
  'inventory',
  'settings',
  'currentSceneId',
  'sceneCharacters',
  'gameTime'
];

export const StorageManager = {

  /**
   * 全量保存到 localStorage
   * 仅持久化 SAVE_KEYS 中定义的键 + 时间戳
   * @param {Object} state - AppState 的完整状态对象
   * @returns {boolean} 是否保存成功
   */
  save(state) {
    try {
      var saveData = {};
      SAVE_KEYS.forEach(function (key) {
        saveData[key] = state[key];
      });
      saveData.timestamp = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
      return true;
    } catch (e) {
      console.error('[StorageManager] 保存失败:', e);
      return false;
    }
  },

  /**
   * 从 localStorage 加载存档
   * @returns {Object|null} 存档对象；无存档或解析/校验失败时返回 null
   */
  load() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      var data = JSON.parse(raw);

      // 基本校验：必须包含 player 和 gamePhase
      if (!data.player || !data.gamePhase) {
        console.warn('[StorageManager] 存档数据格式无效');
        return null;
      }

      // 阵容对账：旧版存档（旧 6 人阵容）→ 标准 9 人阵容
      data = this._reconcileRoster(data);

      // 场景对账：currentSceneId 指向已删除/未知场景（如已移除的公司场景）时回落客厅，
      // 否则读档后无背景/无出口/无物件会白屏软锁，且继续存档坏 id
      if (data.currentSceneId && !SCENES[data.currentSceneId]) {
        console.warn('[StorageManager] 检测到未知场景 ' + data.currentSceneId + '，已回落到 home_living');
        data.currentSceneId = 'home_living';
      }

      return data;
    } catch (e) {
      console.error('[StorageManager] 加载失败:', e);
      return null;
    }
  },

  /**
   * 阵容对账：存档伙伴 id 集合与标准 9 人阵容不一致时重建
   * 触发条件：存档存在 companions 数组，且其 id 集合 ≠ 标准 9 人 id 集合
   * （旧版 6 人阵容存档命中；全新 9 人存档不受影响，原样返回）
   * 触发时：companions 重建为标准默认 9 人，sceneCharacters 清空（旧 id 在场状态
   * 对标准阵容无意义），其余键（player/inventory/settings/gameTime 等）原样保留。
   * 注意：companions 缺失/非数组的存档不做重建，由 AppState 默认值兜底。
   * @param {Object} data - 存档数据
   * @returns {Object} 对账后的存档数据
   */
  _reconcileRoster: function (data) {
    var companions = data.companions;
    if (!Array.isArray(companions)) {
      return data;
    }
    var savedIds = companions.map(function (c) { return c.id; });
    var isCanonical = savedIds.length === DEFAULT_COMPANION_IDS.length &&
      DEFAULT_COMPANION_IDS.every(function (id) { return savedIds.indexOf(id) !== -1; });
    if (isCanonical) {
      return data;
    }
    console.warn('[StorageManager] 检测到旧版阵容存档，已重建为标准 9 人阵容');
    data.companions = getDefaultCompanions();
    data.sceneCharacters = {};
    return data;
  },

  /**
   * 检查 localStorage 中是否存在存档
   * @returns {boolean}
   */
  hasSave() {
    return localStorage.getItem(STORAGE_KEY) !== null;
  },

  /**
   * 清除存档
   */
  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
