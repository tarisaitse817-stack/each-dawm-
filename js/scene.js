// 场景视图：背景层 + 出口 + 物件热点 + 旁白字幕 + 立绘层（在场由行程表派生）
import { AppState } from './state.js?v=30';
import { SCENES, CHARACTERS, getScene } from './scenes-data.js?v=30';
import { getPresent, loadSchedules } from './schedules.js?v=30';

// 头像图片版本号：换图/重裁后 bump 刷新浏览器缓存（图片本身无 hash）
const ASSET_V = '13';

const _subtitleTimer = null;
let _currentSceneId = 'home_living';

/**
 * NPC 氛围文案（用户要求：NPC 密集的地点进入时描述 NPC 行为）。
 * 用于无人场景的环境旁白，也作为有人场景的背景音注入。
 */
const NPC_AMBIENCE = {
  cardshop_inside: '店里正举办着店赛，老板热情地问你要不要参加',
  cardshop_door: '牌店门口贴着店赛海报，进出的牌佬们谈笑风生',
  mall_st: '商业街上人来人往，各家店铺的店员正卖力吆喝',
  mall_dessert: '甜品店里坐满了休息的客人，空气里都是甜丝丝的香气',
  food_st: '小吃街香气四溢，摊主们热情地招呼着过往行人',
  food_bunshop: '包子铺热气腾腾，买早点的客人排着队',
  market_door: '超市门口客流不断，购物袋的摩擦声不绝于耳',
  market_hall: '超市里熙熙攘攘，收银台前排着长队',
  suburb_station: '车站人来人往，列车进站的广播声回荡着',
  suburb_st: '城郊街道上偶尔有车辆驶过，十分安静',
  church: '教堂里很安静，只有零星几位信徒在低声祷告',
  forest: '森林里只有风声与鸟鸣，一片静谧',
  home_door: '家门口很安静，偶尔有邻居经过',
  twins_room: '对门静悄悄的，双子的直播设备还亮着待机灯',
  home_living: '家里静悄悄的，只有时钟的滴答声',
  home_bed: '卧室里静悄悄的，被子还保持着起床后的褶皱',
};

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
      if (opts && opts.instantBg) {
        // 地图缩放入场：背景瞬间切换（禁过渡），与缩放遮罩无缝衔接
        bg.style.transition = 'none';
        bg.classList.remove('active');
        bg.style.backgroundImage = _bgUrl(scene);
        void bg.offsetHeight;
        bg.classList.add('active');
        requestAnimationFrame(() => { bg.style.transition = ''; });
      } else {
        bg.classList.remove('active');
        requestAnimationFrame(() => {
          bg.style.backgroundImage = _bgUrl(scene);
          bg.classList.add('active');
        });
      }
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

  travelTo(sceneId, dir, opts) {
    const from = getScene(_currentSceneId);
    const to = getScene(sceneId);
    if (!to) return;
    if (window.App && typeof window.App.advanceTime === 'function') window.App.advanceTime();
    this.showScene(sceneId, Object.assign({ flipFrom: dir || null }, opts || {}));
    this._enterScene(to);
  },

  /**
   * 进入场景统一入口（用户要求：进场景自动进入文本输入状态）：
   * 1. 打开对话层 —— 有在场角色则立绘登场，无人则环境模式（仅背景+对话区）
   * 2. 翻页动画完成后派发旁白请求，AI 描述在场角色反应；
   *    无人场景描述环境，NPC 密集地点额外描述 NPC 活动（店赛/吆喝/排队等）
   */
  _enterScene(scene) {
    const gameTime = AppState.get('gameTime') || { day: 1, hour: 8, minute: 0 };
    const present = getPresent(scene.id, gameTime);
    const firstChar = present.length ? present[0].charId : null;

    window.dispatchEvent(new CustomEvent('closeup-open', {
      detail: { characterId: firstChar, sceneName: scene.name },
    }));

    // AI 旁白文案：有人 → 角色反应（可带 NPC 背景音）；无人 → 环境/NPC 描写
    // 兜底文案统一由 event.js 处理（"api连接错误，检查一下api哦~"）
    const npcNote = NPC_AMBIENCE[scene.id] || '';
    var aiText;
    if (present.length > 0) {
      var names = present.map((p) => ((CHARACTERS[p.charId] || {}).name || p.charId)).join('、');
      var bgNote = npcNote ? `（背景：${npcNote}）` : '';
      aiText = `（系统提示：你刚进入${scene.name}。在场角色：${names}。${bgNote}请以旁白视角、用2-3句话描述她们注意到你到来时的反应，不要输出角色对话，不要输出任何标签。）`;
    } else if (npcNote) {
      aiText = `（系统提示：你刚进入${scene.name}。${npcNote}。请以旁白视角、用2-3句话描述这里的环境与NPC们的活动，不要输出任何标签。）`;
    } else {
      aiText = `（系统提示：你刚进入${scene.name}，这里空无一人。请以旁白视角、用2-3句话描述这个环境，不要输出任何标签。）`;
    }

    setTimeout(function () {
      window.dispatchEvent(new CustomEvent('scene-narration-request', {
        detail: { aiText: aiText },
      }));
    }, 900); // 翻页动画(~700ms)结束后
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
