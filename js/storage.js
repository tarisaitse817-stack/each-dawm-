/* ==========================================================================
   光之回响 (Echoes of Light) — StorageManager localStorage 持久化
   ========================================================================== */

/** localStorage 存储键名 */
const STORAGE_KEY = 'light-echoes-save';

/** 需要持久化的顶层状态键列表（不含运行时/会话状态） */
const SAVE_KEYS = [
  'player',
  'gamePhase',
  'companions',
  'inventory',
  'mapNodes',
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

      return data;
    } catch (e) {
      console.error('[StorageManager] 加载失败:', e);
      return null;
    }
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
