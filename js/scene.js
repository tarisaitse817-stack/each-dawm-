// 场景视图：背景层 + 出口 + 物件热点 + 旁白字幕 + 立绘层（在场由行程表派生）
import { AppState } from './state.js?v=19';
import { SCENES, CHARACTERS, getScene } from './scenes-data.js?v=19';
import { getPresent, loadSchedules } from './schedules.js?v=19';

// 头像图片版本号：换图/重裁后 bump 刷新浏览器缓存（图片本身无 hash）
const ASSET_V = '13';

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
    div.addEventListener('click', () => SceneView.travelTo(e.to, e.dir));
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
  // 用户要求：人物头像移入左侧导航栏「当前场景角色」区块（sidebar-char-list）
  const list = document.getElementById('sidebar-char-list');
  if (!list) return;
  list.innerHTML = '';
  const gameTime = AppState.get('gameTime') || { day: 1, hour: 8, minute: 0 };
  const present = getPresent(scene.id, gameTime);

  // 派生态写回：在场角色 present:true，不在场清除（AI compact_state 等继续使用）
  const sc = {};
  present.forEach(function (p) { sc[p.charId] = { present: true, emotion: 'neutral' }; });
  AppState.set('sceneCharacters', sc);

  if (present.length === 0) {
    list.innerHTML = '<div class="sidebar-char-empty">（无人）</div>';
    return;
  }

  present.forEach(function (p) {
    const meta = CHARACTERS[p.charId];
    if (!meta) return;
    const div = document.createElement('div');
    div.className = 'sidebar-char';
    div.title = meta.name + (p.activity ? ' · ' + p.activity : '');
    const img = new Image();
    img.className = 'sidebar-char-img';
    img.alt = meta.name;
    // 圆形头部头像（关系页同款）；缺失时立绘兜底
    img.src = `assets/companions/${p.charId}.png?v=${ASSET_V}`;
    img.onerror = () => {
      const fallback = new Image();
      fallback.className = 'sidebar-char-img';
      fallback.src = `assets/characters/${p.charId}/standing.png?v=${ASSET_V}`;
      fallback.onerror = () => { div.classList.add('sidebar-char-missing'); fallback.remove(); };
      img.replaceWith(fallback);
    };
    div.appendChild(img);
    // 用户要求：展开态也不显示人物名称（仅头像列）
    div.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('closeup-open', { detail: { characterId: p.charId } }));
    });
    list.appendChild(div);
  });
}

export const SceneView = {
  init() {
    document.getElementById('panel-scene').innerHTML = `
      <div class="scene-canvas">
        <div id="scene-exit-layer"></div>
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

  showScene(sceneId, opts) {
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
    // 出口翻页动画：新场景如书页从点击方向翻开盖住旧场景
    if (opts && opts.flipFrom) this._playFlip(scene, opts.flipFrom);
  },

  /**
   * 场景翻页动画：覆盖层贴上新场景背景，按出口方向设定旋转轴，
   * 从垂直于屏幕翻到平铺（700ms）。左侧按钮 → 从左往右翻；右侧镜像；
   * 顶部/底部（居中按钮）→ 从上往下翻。
   * @param {Object} scene - 目标场景
   * @param {string} dir - 出口方向 left / right / top / bottom
   */
  _playFlip(scene, dir) {
    var overlay = document.getElementById('scene-flip');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'scene-flip';
      document.body.appendChild(overlay);
    }
    // 快速连点多个出口：取消上一次翻页的收尾（防旧监听器误删新遮罩）
    if (overlay._flipOnEnd) overlay.removeEventListener('animationend', overlay._flipOnEnd);
    if (overlay._flipTimer) { clearTimeout(overlay._flipTimer); overlay._flipTimer = null; }

    overlay.className = 'scene-flip from-' + dir;
    overlay.style.backgroundImage = _bgUrl(scene);
    void overlay.offsetHeight; // 强制重绘重启动画

    var finish = function () {
      if (overlay._flipOnEnd) {
        overlay.removeEventListener('animationend', overlay._flipOnEnd);
        overlay._flipOnEnd = null;
      }
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
    // 动画结束后移除（animationend + setTimeout 兜底，防事件丢失残留遮罩）
    overlay._flipOnEnd = finish;
    overlay.addEventListener('animationend', finish, { once: true });
    overlay._flipTimer = setTimeout(finish, 1200);
  },

  travelTo(sceneId, dir) {
    const from = getScene(_currentSceneId);
    const to = getScene(sceneId);
    if (!to) return;
    if (window.App && typeof window.App.advanceTime === 'function') window.App.advanceTime();
    this.showScene(sceneId, { flipFrom: dir || null });
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
