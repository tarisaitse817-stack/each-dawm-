// 场景视图：背景层 + 出口 + 物件热点 + 旁白字幕 + 立绘层（立绘逻辑在 Task 4 补全）
import { AppState } from './state.js';
import { SCENES, getScene } from './scenes-data.js';

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

export const SceneView = {
  init() {
    document.getElementById('panel-scene').innerHTML = `
      <div class="scene-canvas">
        <div id="scene-exit-layer"></div>
        <div id="scene-character-layer" class="scene-character-layer"></div>
        <div id="scene-object-layer"></div>
        <div id="scene-subtitle" class="scene-subtitle"></div>
      </div>`;
    this.showScene(AppState.get('currentSceneId'));
  },

  render() { this.showScene(AppState.get('currentSceneId')); },

  showScene(sceneId) {
    const scene = getScene(sceneId);
    if (!scene) return;
    _currentSceneId = sceneId;
    AppState.set('currentSceneId', sceneId);
    const bg = document.getElementById('location-bg');
    bg.classList.remove('active');
    requestAnimationFrame(() => {
      bg.style.backgroundImage = _bgUrl(scene);
      bg.classList.add('active');
    });
    _renderExits(scene);
    _renderObjects(scene);
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
