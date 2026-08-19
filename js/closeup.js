// 全屏特写视图（v2 流程）：点击头像 → 立绘居中（standing）→ 对话开始 2 秒后 → CG 3 秒（如有）
// → 回到立绘继续对话常驻。无 CG 时全程立绘。
// 降级链：standing.png → neutral.png（emotionFile）→ fullbody.png → 「立绘缺失」占位
import { AppState } from './state.js?v=39';
import { CHARACTERS, emotionFile } from './scenes-data.js?v=39';
import { getCgPath } from './schedules.js?v=39';
import { CgGenerator, AiClient } from './ai.js?v=39';

// 素材版本号：头像/CG/立绘图片 URL 统一加 v 参数（图片本身无 hash，
// 重裁/换图后必须 bump 才能刷新用户浏览器缓存；JS 模块走 import 的 v 参数）
const ASSET_V = '15';

var _charId = null;
var _phase = 'closed'; // closed | standing | cg
var _timers = [];
var _pendingCgPath = null;
var _cgScheduled = false; // 每次 open 只安排一次 CG

function _fullbodyFallbackPath(charId) {
  return `assets/characters/${charId}/fullbody.png?v=${ASSET_V}`;
}

function _clearTimers() {
  _timers.forEach(clearTimeout);
  _timers = [];
}

function _setPhase(phase) {
  _phase = phase;
  var overlay = document.getElementById('closeup-overlay');
  if (overlay) {
    overlay.classList.toggle('phase-cg', phase === 'cg');
    overlay.classList.toggle('phase-standing', phase === 'standing');
  }
}

export const CloseupView = {
  init() {
    const overlay = document.createElement('div');
    overlay.id = 'closeup-overlay';
    overlay.innerHTML = `
      <div class="closeup-backdrop"></div>
      <div class="closeup-scene-bg" id="closeup-scene-bg"></div>
      <div class="closeup-portrait" id="closeup-portrait"></div>
      <button class="closeup-close" id="closeup-close-btn">关闭 ✕</button>
      <div class="closeup-header"><span class="char-name" id="closeup-name"></span></div>
      <div class="closeup-dialog" id="closeup-dialog"></div>`;
    document.body.appendChild(overlay);
    document.getElementById('closeup-close-btn').addEventListener('click', () => this.close());
    // Esc 键关闭特写（spec：「Esc / 关闭按钮」回场景）：仅当特写层 active 时响应；
    // 输入框/文本域聚焦时不抢 Esc（避免影响对话输入等场景）；
    // 伙伴详情弹层（companion-detail）的 Esc 由 app.js 独立处理，此处以 active 为界不干扰
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      const t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      if (!overlay.classList.contains('active')) return;
      this.close();
    });
    // 序列播放中点击任意处跳过 CG 段
    overlay.addEventListener('click', (e) => {
      if (e.target.closest('#closeup-close-btn') || e.target.closest('#closeup-dialog')) return;
      if (_phase === 'cg') this._finishCgPhase();
    });
  },

  open(characterId) {
    _charId = characterId;
    const meta = CHARACTERS[characterId];
    if (!meta) return;
    _clearTimers();
    _cgScheduled = false;
    _pendingCgPath = getCgPath(characterId, AppState.get('gameTime')) || null;
    AppState.set('closeup', { active: true, characterId, emotion: 'neutral' });
    document.getElementById('closeup-name').textContent = meta.name;
    const overlay = document.getElementById('closeup-overlay');
    overlay.classList.add('active');

    // 场景背景层：取当前场景 bg，序列后淡入
    const bg = document.getElementById('closeup-scene-bg');
    bg.classList.remove('visible');
    const scene = document.getElementById('location-bg');
    if (scene && scene.style.backgroundImage) {
      bg.style.backgroundImage = scene.style.backgroundImage;
    }

    // 先立绘（v2：点击即立绘，CG 由 onDialogueStarted 安排，对话开始 2 秒后播放）
    this._startStandingPhase();
  },

  /**
   * 对话开始通知（event.js 首条叙事打字、开局寒暄首句显示时调用）。
   * 用户要求：取消剧情中点击角色时的 CG —— 立绘常驻，不再切入 CG 段。
   * （原「对话 2 秒后 CG」逻辑下线；_startCgPhase 保留备用）
   */
  onDialogueStarted() {
    // 已取消：点击角色 → 全程立绘
  },

  /* CG 段：全屏 CG 3 秒（加载失败直接回立绘段） */
  _startCgPhase(cgPath) {
    _setPhase('cg');
    const el = document.getElementById('closeup-portrait');
    el.innerHTML = '';
    const img = new Image();
    img.className = 'closeup-cg';
    img.alt = CHARACTERS[_charId].name;
    img.onload = () => {
      if (_phase !== 'cg') return;
      _timers.push(setTimeout(() => this._finishCgPhase(), 3000));
    };
    img.onerror = () => {
      if (_phase !== 'cg') return;
      this._startStandingPhase();
    };
    img.src = cgPath + `?v=${ASSET_V}`;
    el.appendChild(img);
  },

  _finishCgPhase() {
    _clearTimers();
    this._startStandingPhase();
  },

  /* 立绘段：standing.png 居中 → 0.6s 后场景背景淡入 */
  _startStandingPhase() {
    _setPhase('standing');
    const el = document.getElementById('closeup-portrait');
    el.innerHTML = '';
    el.classList.remove('sprite-missing');
    const img = new Image();
    img.className = 'closeup-standing';
    img.alt = CHARACTERS[_charId].name;
    img.onerror = () => { if (!img.isConnected) return; img.remove(); this._tryEmotionFallback(); };
    img.src = `assets/characters/${_charId}/standing.png?v=${ASSET_V}`;
    el.appendChild(img);
    _timers.push(setTimeout(() => {
      const bg = document.getElementById('closeup-scene-bg');
      if (bg) bg.classList.add('visible');
    }, 600));
  },

  /* 立绘缺失降级链：neutral.png → fullbody.png → 占位 */
  _tryEmotionFallback() {
    const el = document.getElementById('closeup-portrait');
    const tryFullbody = () => {
      const fb = new Image();
      fb.src = _fullbodyFallbackPath(_charId);
      fb.onerror = () => { if (!fb.isConnected) return; el.classList.add('sprite-missing'); el.textContent = '立绘缺失'; };
      el.appendChild(fb);
    };
    const img = new Image();
    img.src = emotionFile(_charId, 'neutral') + `?v=${ASSET_V}`;
    img.onerror = () => { if (!img.isConnected) return; img.remove(); tryFullbody(); };
    el.appendChild(img);
  },

  /**
   * 环境模式：无人场景进入对话时打开特写层（无立绘、无 CG），
   * 仅场景背景 + 对话区，供玩家输入。
   */
  openScene(sceneName) {
    _clearTimers();
    _cgScheduled = true; // 环境模式不安排 CG
    _pendingCgPath = null;
    _charId = null;
    _setPhase('standing');
    AppState.set('closeup', { active: true, characterId: null, emotion: 'neutral' });
    document.getElementById('closeup-name').textContent = sceneName || '';
    const overlay = document.getElementById('closeup-overlay');
    overlay.classList.add('active');
    const portrait = document.getElementById('closeup-portrait');
    portrait.innerHTML = '';
    portrait.classList.remove('sprite-missing');
    const bg = document.getElementById('closeup-scene-bg');
    bg.classList.remove('visible');
    const scene = document.getElementById('location-bg');
    if (scene && scene.style.backgroundImage) {
      bg.style.backgroundImage = scene.style.backgroundImage;
    }
    _timers.push(setTimeout(() => {
      const bgEl = document.getElementById('closeup-scene-bg');
      if (bgEl) bgEl.classList.add('visible');
    }, 600));
  },

  /**
   * 静默切换角色立绘（开局寒暄用）：换人但不触发 CG、不打断对话区
   */
  switchCharacter(characterId) {
    const meta = CHARACTERS[characterId];
    if (!meta) return;
    _charId = characterId;
    _cgScheduled = true; // 切换后的角色不再安排 CG（本次打开 CG 只属于首个角色）
    AppState.set('closeup', { active: true, characterId, emotion: 'neutral' });
    document.getElementById('closeup-name').textContent = meta.name;
    this._startStandingPhase();
  },

  close() {
    _clearTimers();
    _setPhase('closed');
    _cgScheduled = false;
    _pendingCgPath = null;
    AppState.set('closeup', { active: false, characterId: null, emotion: 'neutral' });
    document.getElementById('closeup-overlay').classList.remove('active');
    const bg = document.getElementById('closeup-scene-bg');
    if (bg) bg.classList.remove('visible');
    _charId = null;
  },

  /* 表情切换：仅记录状态（表情差分维持推后，立绘保持 standing） */
  setEmotion(emotion) {
    AppState.set('closeup', { active: true, characterId: _charId, emotion });
  },

  getDialogEl() { return document.getElementById('closeup-dialog'); },
};

/**
 * 决斗结束胜败 CG（用户新 idea）：决斗结束后全屏展示战胜/战败 CG，
 * 点击任意处关闭（关闭后回调继续后续叙事）。
 * 素材：assets/cg/victory.png（战胜）/ assets/cg/defeat.png（战败）；
 * 缺图时降级为文字版胜/负全屏（金色/暗红色大字 + 光晕）。
 * @param {boolean} playerWon - 玩家是否获胜
 * @param {Function} onDone - 玩家点击关闭后的回调
 */
export function showDuelResultCg(playerWon, onDone, opts) {
  const overlay = document.createElement('div');
  overlay.id = 'duel-cg-overlay';
  const img = new Image();
  img.className = 'duel-cg-img';
  img.alt = playerWon ? '胜利' : '败北';
  const hint = document.createElement('div');
  hint.className = 'duel-cg-hint';
  hint.textContent = '点击继续 ▸';

  overlay.append(img, hint);
  document.body.appendChild(overlay);

  var done = false;
  var finish = function () {
    if (done) return;
    done = true;
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.removeEventListener('keydown', onKey);
    if (onDone) onDone();
  };
  var onKey = function (e) {
    if (e.key === 'Escape' || e.key === 'Enter') finish();
  };
  overlay.addEventListener('click', finish);
  document.addEventListener('keydown', onKey);

  // 素材加载：失败降级为纯暗场 + 提示（用户要求：不显示大字）
  img.onerror = function () {
    if (done) return;
    img.remove();
    hint.textContent = '点击继续 ▸';
  };

  // 用户需求：通过 ComfyUI 动态生成胜败 NSFW CG（bridge 转发 + 轮询）
  var genPrompt = opts && opts.genPrompt;
  if (genPrompt) {
    hint.textContent = 'CG 生成中，请稍候…';
    var started = Date.now();
    var retryTimer = null;
    var poll = function () {
      if (done) return;
      if (Date.now() - started > 360000) { // 6 分钟超时 → 暗场兜底
        img.remove();
        hint.textContent = '点击继续 ▸';
        return;
      }
      img.src = '';
      img.src = CgGenerator.imageUrl(cgJobId) + '&t=' + Date.now();
      retryTimer = setTimeout(poll, 3000);
    };
    var cgJobId = null;
    CgGenerator.generate(genPrompt).then(function (id) {
      cgJobId = id;
      poll();
    }).catch(function (err) {
      console.warn('[showDuelResultCg] 生成失败，暗场兜底:', err.message);
      img.remove();
      hint.textContent = '点击继续 ▸';
    });
    img.onload = function () {
      clearTimeout(retryTimer);
      hint.textContent = '点击继续 ▸';
    };
    img.onerror = function () {
      if (!cgJobId || done) return; // 生成请求还没返回，先不处理
      // 404 = 尚未出图（poll 定时器继续重试）；查一次任务状态，error 立即兜底
      fetch(AiClient.endpoint + '/cg-status?id=' + cgJobId)
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.status === 'error') {
            clearTimeout(retryTimer);
            img.remove();
            hint.textContent = '点击继续 ▸';
            console.warn('[showDuelResultCg] 生成失败:', d.message);
          }
        })
        .catch(function () {});
    };
    return;
  }

  img.src = (playerWon ? 'assets/cg/victory.png' : 'assets/cg/defeat.png') + '?v=' + ASSET_V;
}
