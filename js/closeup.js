// 全屏特写视图：点击头像 → CG 3 秒（如有）→ 立绘居中 → 场景背景淡入 → 对话常驻
// 降级链：standing.png → neutral.png（emotionFile）→ fullbody.png → 「立绘缺失」占位
import { AppState } from './state.js';
import { CHARACTERS, emotionFile } from './scenes-data.js';
import { getCgPath } from './schedules.js';

var _charId = null;
var _phase = 'closed'; // closed | cg | standing
var _timers = [];

function _fullbodyFallbackPath(charId) {
  return `assets/characters/${charId}/fullbody.png`;
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

    const cgPath = getCgPath(characterId, AppState.get('gameTime'));
    if (cgPath) {
      this._startCgPhase(cgPath);
    } else {
      this._startStandingPhase();
    }
  },

  /* CG 段：全屏 CG 3 秒（加载失败直接进立绘段） */
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
    img.src = cgPath;
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
    img.src = `assets/characters/${_charId}/standing.png`;
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
    img.src = emotionFile(_charId, 'neutral');
    img.onerror = () => { if (!img.isConnected) return; img.remove(); tryFullbody(); };
    el.appendChild(img);
  },

  close() {
    _clearTimers();
    _setPhase('closed');
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
