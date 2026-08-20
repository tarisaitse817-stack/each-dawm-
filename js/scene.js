// 场景视图：背景层 + 出口 + 物件热点 + 旁白字幕 + 立绘层（在场由行程表派生）
import { AppState } from './state.js?v=62';
import { SCENES, CHARACTERS, getScene, isSceneOpen, sceneName } from './scenes-data.js?v=62';
import { getPresent, loadSchedules } from './schedules.js?v=62';

/** 打烊提示文案（用户要求） */
const CLOSED_MSG = '已经到了非营业时间了，明天再来吧';

// 头像图片版本号：换图/重裁后 bump 刷新浏览器缓存（图片本身无 hash）
const ASSET_V = '20';

const _subtitleTimer = null;
let _currentSceneId = 'home_living';
let _duelBgOverride = null; // 决斗结束后的 CG 背景覆盖（切场景时清除）

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
  balcony: '阳台上的花花草草长得正旺，微风吹来一阵草木清香',
  winda_room: '房间里拉着厚厚的窗帘，光线昏暗，安静得有些压抑',
  riverside: '河边很安静，只有潺潺的水声与偶尔的鸟鸣',
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
    // 出口标签走动态场景名（米德拉什房间初见前显示「新邻居的房间」）
    div.innerHTML = `<span class="exit-label">${sceneName(e.to)}</span>`;
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
    // 场景切换：清除决斗 CG 背景覆盖（用户要求：CG 背景持续到更换场景为止）
    _duelBgOverride = null;
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
    this.showSubtitle(`${sceneName(scene.id)} · ${scene.description}`);
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
    // 营业时间检查（用户要求）：打烊场景拦截进入，不计时间、不触发转场
    const t = AppState.get('gameTime') || { day: 1, hour: 8, minute: 0 };
    if (!isSceneOpen(to, t.hour)) {
      this.showSubtitle(CLOSED_MSG);
      return false;
    }
    // 离场规则（用户要求）：时间推进前捕获离开场景的在场角色，供进入新场景时描述离场行为
    const leaving = { fromSceneName: from.name, present: getPresent(from.id, t) };

    if (window.App && typeof window.App.advanceTime === 'function') window.App.advanceTime();
    this.showScene(sceneId, Object.assign({ flipFrom: dir || null }, opts || {}));
    this._enterScene(to, leaving);
    return true;
  },

  /**
   * 进入场景统一入口（用户要求：进场景自动进入文本输入状态）：
   * 1. 打开对话层 —— 有在场角色则立绘登场，无人则环境模式（仅背景+对话区）
   * 2. 翻页动画完成后派发旁白请求，AI 描述在场角色反应；
   *    无人场景描述环境，NPC 密集地点额外描述 NPC 活动（店赛/吆喝/排队等）
   */
  _enterScene(scene, leaving) {
    const gameTime = AppState.get('gameTime') || { day: 1, hour: 8, minute: 0 };
    const present = getPresent(scene.id, gameTime);
    const firstChar = present.length ? present[0].charId : null;

    window.dispatchEvent(new CustomEvent('closeup-open', {
      detail: { characterId: firstChar, sceneName: scene.name },
    }));

    // 醋意值触发（用户要求）：在场配角醋意值 ≥40 时，35% 概率主动发起黑暗决斗，
    // 挑战卡片代替普通场景旁白
    var challengerName = null;
    present.forEach(function (p) {
      if (challengerName) return;
      var comp = (AppState.get('companions') || []).find(function (c) { return c.id === p.charId; });
      if (comp && (comp.jealousy || 0) >= 40 && Math.random() < 0.35) {
        challengerName = comp.name;
      }
    });
    if (challengerName) {
      console.log('[SceneView] ' + challengerName + ' 醋意值触发主动挑战');
      setTimeout(function () {
        window.dispatchEvent(new CustomEvent('proactive-duel-request', {
          detail: { name: challengerName },
        }));
      }, 900); // 翻页动画(~700ms)结束后
      return;
    }

    // 初见系统（世界观 V4）：在场角色中有未解锁精灵
    // 主动挑战名单（塞壬/塞拉/米德拉什/理/柴郡猫）→ 初见旁白 + 黑暗决斗卡片；
    // 其余未解锁精灵（白兔/王后/白后/红心）→ 仅初见旁白，等待玩家主动挑战
    var ACTIVE_CHALLENGERS = ['塞壬', '塞拉', '米德拉什', '理', '柴郡猫'];
    var encounterName = null;
    present.forEach(function (p) {
      if (encounterName) return;
      var comp = (AppState.get('companions') || []).find(function (c) { return c.id === p.charId; });
      if (comp && comp.unlocked === false) {
        encounterName = comp.name;
      }
    });
    var isActive = encounterName && ACTIVE_CHALLENGERS.indexOf(encounterName) >= 0;
    // 首见剧情事件：河边塞壬 / 森林塞拉陷阱 / 教堂理 / 新邻居房间米德拉什
    var sceneEv = AppState.get('sceneEvents') || {};
    var firstEvent = '';
    if (encounterName === '塞壬' && !sceneEv.riverside_seen) firstEvent = 'riverside';
    else if (encounterName === '塞拉' && !sceneEv.forest_seen) firstEvent = 'forest';
    else if (encounterName === '理' && !sceneEv.church_seen) firstEvent = 'church';
    else if (encounterName === '米德拉什' && !sceneEv.winda_met) firstEvent = 'winda';
    // 标记首次触发（winda 的标记由决斗结束后 event.js 写入，用于房间改名）
    if (firstEvent && firstEvent !== 'winda') {
      var ev2 = JSON.parse(JSON.stringify(sceneEv));
      ev2[firstEvent + '_seen'] = true;
      AppState.set('sceneEvents', ev2);
    }

    // 离场规则（用户要求）：离开时有人在场 → 提示 AI 按角色性格描述离场行为
    // （如「看见你离开，XX也亦步亦趋地跟随着你」「微笑着祝你一路顺风」）；
    // 只有路人 NPC → 提示 AI 简单描述（如「你逆着人流，离开了XX」）
    var leaveNames = (leaving && leaving.present)
      ? leaving.present.map((p) => ((CHARACTERS[p.charId] || {}).name || p.charId))
      : [];
    var fromName = (leaving && leaving.fromSceneName) || '';
    var movePart = fromName ? `你刚离开了${fromName}，来到${scene.name}` : `你刚进入${scene.name}`;
    var leavePart = '';
    if (fromName && leaveNames.length > 0) {
      leavePart = `离开${fromName}时，在场角色：${leaveNames.join('、')}。请先依据她们各自的性格，用1-2句话描述她们看见你离开时的反应（例如：看见你离开，XX也亦步亦趋地跟随着你；或微笑着祝你一路顺风）；`;
    } else if (fromName) {
      leavePart = `离开${fromName}时没有其他角色在场，可简单带过（例如「你逆着人流，离开了${fromName}」）；`;
    }

    // AI 旁白文案：首见剧情事件 → 事件专属描写 + 黑暗决斗；
    // 主动型初见 → 惊讶触发黑暗决斗；被动型初见 → 仅旁白（等玩家主动）；
    // 有人 → 角色反应（可带 NPC 背景音）；无人 → 环境/NPC 描写。
    // 兜底文案统一由 event.js 处理（"api连接错误，检查一下api哦~"）
    const npcNote = NPC_AMBIENCE[scene.id] || '';
    var aiText;
    if (firstEvent === 'riverside') {
      aiText = `（系统提示：${movePart}。你在河边看见了一个泡在河水里的少女。周围的游人似乎完全看不见她的身影，更看不见她的鱼尾——只有你，惊讶地注视着她那不属于人类的部分。她察觉了你的目光，认定你就是导致她穿越而来的元凶，向你发起了黑暗决斗。请以旁白视角、用2-3句话描述这场河边初见，不要输出角色对话，不要输出任何标签。）`;
    } else if (firstEvent === 'forest') {
      aiText = `（系统提示：${movePart}。你在森林里一脚踩空，掉进了一个伪装成落叶堆的陷阱。一个绿色双马尾的少女从树后跳了出来，得意洋洋地宣告这是她的地盘，随即向你发起了黑暗决斗。请以旁白视角、用2-3句话描述这场森林邂逅，不要输出角色对话，不要输出任何标签。）`;
    } else if (firstEvent === 'church') {
      aiText = `（系统提示：${movePart}。你在教堂里祷告时不知不觉睡着了。醒来时，一个披着红色长袍的少女正安静地注视着你——她发现你能看见她的本体，认定你就是一切的源头，主动向你发起了黑暗决斗。请以旁白视角、用2-3句话描述这场教堂初见，不要输出角色对话，不要输出任何标签。）`;
    } else if (firstEvent === 'winda') {
      aiText = `（系统提示：${movePart}。你好奇地推开了这间从未进去过的房间——窗帘紧闭，光线昏暗，墙上贴满了你的照片。黑暗深处，一个青绿色头发的少女缓缓转过头，低语着「终于等到你了」，随即向你发起了黑暗决斗。请以旁白视角、用2-3句话描述这场惊悚的初见，不要输出角色对话，不要输出任何标签。）`;
    } else if (isActive) {
      aiText = `（系统提示：${movePart}。你在${scene.name}遇见了从未见过的精灵${encounterName}——只有你能看见她的本体。你表现出的惊讶让她认定你就是一切的源头，她向你发起了黑暗决斗。请以旁白视角、用2-3句话描述这场突如其来的初见，不要输出角色对话，不要输出任何标签。）`;
    } else if (encounterName) {
      aiText = `（系统提示：${movePart}。你在${scene.name}看见了从未见过的精灵${encounterName}——只有你能看见她的本体。她注意到了你的视线，却没有主动出手的迹象。请以旁白视角、用2-3句话描述这场初见，不要输出角色对话，不要输出任何标签。）`;
    } else if (present.length > 0) {
      var names = present.map((p) => ((CHARACTERS[p.charId] || {}).name || p.charId)).join('、');
      var bgNote = npcNote ? `（背景：${npcNote}）` : '';
      aiText = `（系统提示：${movePart}。${leavePart}在场角色：${names}。${bgNote}请以旁白视角、用2-3句话描述她们注意到你到来时的反应，不要输出角色对话，不要输出任何标签。）`;
    } else if (npcNote) {
      aiText = `（系统提示：${movePart}。${leavePart}${npcNote}。请以旁白视角、用2-3句话描述这里的环境与NPC们的活动，不要输出任何标签。）`;
    } else {
      aiText = `（系统提示：${movePart}。${leavePart}这里空无一人。请以旁白视角、用2-3句话描述这个环境，不要输出任何标签。）`;
    }

    setTimeout(function () {
      window.dispatchEvent(new CustomEvent('scene-narration-request', {
        detail: { aiText: aiText, encounterName: (firstEvent || isActive) ? encounterName : '' },
      }));
    }, 900); // 翻页动画(~700ms)结束后
  },

  /**
   * 决斗结束 CG 背景（用户要求）：战胜/战败后把背景替换为对应 CG，
   * 直到下次更换场景（showScene 自动恢复原场景背景）
   * @param {string} url - CG 图片路径
   */
  setDuelBackground(url) {
    if (!url) return;
    _duelBgOverride = url;
    const bg = document.getElementById('location-bg');
    if (bg) {
      bg.classList.add('active');
      bg.style.backgroundImage = `url('${url}')`;
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
