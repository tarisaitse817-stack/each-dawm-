// 全屏特写视图：脸部特写图居中 + 底部对话区（对话引擎挂载 #closeup-dialog，对外 API 不变）
// 降级链：neutral.png（emotionFile）→ fullbody.png（路径硬编码）→ 「立绘缺失」占位
import { AppState } from './state.js';
import { CHARACTERS, emotionFile } from './scenes-data.js';

let _charId = null;

function _fullbodyFallbackPath(charId) {
  return `assets/characters/${charId}/fullbody.png`;
}

export const CloseupView = {
  init() {
    const overlay = document.createElement('div');
    overlay.id = 'closeup-overlay';
    overlay.innerHTML = `
      <div class="closeup-backdrop"></div>
      <div class="closeup-portrait" id="closeup-portrait"></div>
      <button class="closeup-close" id="closeup-close-btn">关闭 ✕</button>
      <div class="closeup-header"><span class="char-name" id="closeup-name"></span></div>
      <div class="closeup-dialog" id="closeup-dialog"></div>`;
    document.body.appendChild(overlay);
    document.getElementById('closeup-close-btn').addEventListener('click', () => this.close());
  },

  open(characterId) {
    _charId = characterId;
    const meta = CHARACTERS[characterId];
    if (!meta) return;
    AppState.set('closeup', { active: true, characterId, emotion: 'neutral' });
    document.getElementById('closeup-name').textContent = meta.name;
    document.getElementById('closeup-overlay').classList.add('active');
    this.setEmotion('neutral');
  },

  close() {
    AppState.set('closeup', { active: false, characterId: null, emotion: 'neutral' });
    document.getElementById('closeup-overlay').classList.remove('active');
    _charId = null;
  },

  setEmotion(emotion) {
    const el = document.getElementById('closeup-portrait');
    el.innerHTML = '';
    el.classList.remove('sprite-missing');
    const tryFullbody = () => {
      const fb = new Image();
      fb.src = _fullbodyFallbackPath(_charId);
      fb.onerror = () => { if (!fb.isConnected) return; el.classList.add('sprite-missing'); el.textContent = '立绘缺失'; };
      el.appendChild(fb);
    };
    const img = new Image();
    img.src = emotionFile(_charId, emotion);
    img.onerror = () => { if (!img.isConnected) return; img.remove(); tryFullbody(); };
    el.appendChild(img);
    AppState.set('closeup', { active: true, characterId: _charId, emotion });
  },

  getDialogEl() { return document.getElementById('closeup-dialog'); },
};
