// 近景特写层：大立绘 + 表情差分 + 对话区（对话引擎在 Task 6 接入）
import { AppState } from './state.js';
import { CHARACTERS, emotionFile } from './scenes-data.js';

let _charId = null;

export const CloseupView = {
  init() {
    const overlay = document.createElement('div');
    overlay.id = 'closeup-overlay';
    overlay.innerHTML = `
      <div class="closeup-backdrop"></div>
      <div class="closeup-portrait" id="closeup-portrait"></div>
      <div class="closeup-header"><span class="char-name" id="closeup-name"></span></div>
      <button class="closeup-close" id="closeup-close-btn">关闭 ✕</button>
      <div class="closeup-dialog" id="closeup-dialog"></div>
      <button class="closeup-duel" id="closeup-duel-btn">⚔ 提出决斗</button>`;
    document.body.appendChild(overlay);
    document.getElementById('closeup-close-btn').addEventListener('click', () => this.close());
    // 决斗按钮占位：Task 6 对话引擎接入时接 BattleBridge.launch + startPolling 链路
    document.getElementById('closeup-duel-btn').addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('closeup-duel', { detail: { characterId: _charId } }));
    });
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
    const img = new Image();
    img.src = emotionFile(_charId, emotion);
    img.onerror = () => { el.classList.add('sprite-missing'); el.textContent = '立绘缺失'; };
    el.appendChild(img);
    AppState.set('closeup', { active: true, characterId: _charId, emotion });
  },

  getDialogEl() { return document.getElementById('closeup-dialog'); },
};
