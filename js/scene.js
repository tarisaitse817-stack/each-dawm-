// 场景视图：背景层 + 出口 + 物件热点 + 旁白字幕 + 立绘层（在场由行程表派生）
import { AppState } from './state.js?v=14';
import { SCENES, CHARACTERS, getScene } from './scenes-data.js?v=14';
import { getPresent, loadSchedules } from './schedules.js?v=14';

// 头像图片版本号：换图/重裁后 bump 刷新浏览器缓存（图片本身无 hash）
const ASSET_V = '12';

const _subtitleTimer = null;
let _currentSceneId = 'home_living';

function _bgUrl(scene) {
  return `url('${scene.bg}')`;
}

function _renderExits(scene) {
  const layer = document.getElementById('scene-exit-layer');
  layer.innerHTML = '';
  for (const e of scene.exits) {
    const div = document.createElement('div');
    div.className = `scene-exit exit-${e.dir}`;
    div.innerHTML = `<span class="exit-label">${e.label}</span>`;
    div.addEventListener('click', () => SceneView.travelTo(e.to));
    layer.appendChild(div);
  }
}

function _renderObjects(scene) {
  const layer = document.getElementById('scene-object-layer');
  layer.innerHTML = '';
  for (const o of scene.objects) {
    const div = document.createElement('div');
    div.className = 'scene-object';
    div.style.left = `${o.x * 100}%`;
    div.style.top = `${o.y * 100}%`;
    div.innerHTML = `<span class="obj-dot">✦</span>`;
    div.title = o.label;
    div.addEventListener('click', () => SceneView.showSubtitle(o.desc));
    layer.appendChild(div);
  }
}

function _renderAvatars(scene) {
  const layer = document.getElementById('scene-character-layer');
  layer.innerHTML = '';
  const gameTime = AppState.get('gameTime') || { day: 1, hour: 8, minute: 0 };
  const present = getPresent(scene.id, gameTime);

  // 派生态写回：在场角色 present:true，不在场清除
  const sc = {};
  present.forEach(function (p) { sc[p.charId] = { present: true, emotion: 'neutral' }; });
  AppState.set('sceneCharacters', sc);

  present.forEach(function (p, i) {
    const meta = CHARACTERS[p.charId];
    if (!meta) return;
    // 用户要求：当前场景人物集体竖向排列在右侧。
    // 横向固定 84%（避开右缘出口按钮），纵向在 25%–75% 区间均匀分布（单人居中），
    // 仅保留 ±1% 纵向微抖动；行程表 spot 坐标不再决定位置（数据层原样保留），
    // spot.scale 仍控制头像大小。
    const count = present.length;
    const colX = 0.84;
    const colY = count <= 1 ? 0.5 : 0.25 + (i / (count - 1)) * 0.5 + (Math.random() * 2 - 1) * 0.01;
    const div = document.createElement('div');
    div.className = 'scene-avatar';
    div.style.left = `${colX * 100}%`;
    div.style.top = `${colY * 100}%`;
    div.style.setProperty('--avatar-size', `${14 * (p.spot.scale || 0.85)}vh`);
    const img = new Image();
    img.className = 'avatar-img';
    img.alt = meta.name;
    // 场景头像优先用关系页同款圆形头像（assets/companions/<id>.png，用户已出图）；
    // 缺失时立绘兜底，仍失败标记缺失
    img.src = `assets/companions/${p.charId}.png?v=${ASSET_V}`;
    img.onerror = () => {
      const fallback = new Image();
      fallback.className = 'avatar-img';
      fallback.src = `assets/characters/${p.charId}/standing.png?v=${ASSET_V}`;
      fallback.onerror = () => { div.classList.add('avatar-missing'); fallback.remove(); };
      img.replaceWith(fallback);
    };
    div.appendChild(img);
    div.insertAdjacentHTML('beforeend', `<span class="avatar-name">${meta.name}</span>`);
    div.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('closeup-open', { detail: { characterId: p.charId } }));
    });
    layer.appendChild(div);
  });
}

export const SceneView = {
  init() {
    document.getElementById('panel-scene').innerHTML = `
      <div class="scene-canvas">
        <div id="scene-exit-layer"></div>
        <div id="scene-character-layer" class="scene-character-layer"></div>
        <div id="scene-object-layer"></div>
        <div id="scene-subtitle" class="scene-subtitle"></div>
      </div>`;
    loadSchedules().then(() => this.renderCharacters());
    window.addEventListener('game-time-advanced', () => this.renderCharacters());
    this.showScene(AppState.get('currentSceneId'));
  },

  render() { this.showScene(AppState.get('currentSceneId')); },

  renderCharacters() {
    const scene = getScene(_currentSceneId);
    if (scene) _renderAvatars(scene);
  },

  showScene(sceneId) {
    const scene = getScene(sceneId);
    if (!scene) return;
    _currentSceneId = sceneId;
    AppState.set('currentSceneId', sceneId);
    const bg = document.getElementById('location-bg');
    if (bg) {
      bg.classList.remove('active');
      requestAnimationFrame(() => {
        bg.style.backgroundImage = _bgUrl(scene);
        bg.classList.add('active');
      });
    }
    _renderExits(scene);
    _renderObjects(scene);
    _renderAvatars(scene);
    this.showSubtitle(`${scene.name} · ${scene.description}`);
  },

  travelTo(sceneId) {
    const from = getScene(_currentSceneId);
    const to = getScene(sceneId);
    if (!to) return;
    if (window.App && typeof window.App.advanceTime === 'function') window.App.advanceTime();
    this.showScene(sceneId);
    if (from) {
      const here = document.querySelector('.scene-exit'); // 到达提示已在 showScene 字幕中
    }
  },

  showSubtitle(text) {
    const el = document.getElementById('scene-subtitle');
    if (!el) return;
    el.textContent = text;
    el.classList.add('visible');
    clearTimeout(SceneView._subtitleTimer);
    SceneView._subtitleTimer = setTimeout(() => el.classList.remove('visible'), 4200);
  },

  setCharacterEmotion(charId, emotion) {
    const sc = AppState.get('sceneCharacters');
    if (sc && sc[charId]) {
      sc[charId].emotion = emotion;
      AppState.set('sceneCharacters', sc);
    }
  },
};

export function showInitialBackground() {
  SceneView.showScene(AppState.get('currentSceneId'));
}
