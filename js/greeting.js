/* ==========================================================================
   光之回响 (Echoes of Light) — 开局寒暄桥段
   新游戏转场结束后播放：按行程表取当前场景在场角色（≤2 人），
   立绘展示 + 每人两句问候，点击推进，最后一句后关闭特写进入自由探索。
   CG 沿用特写层规则（对话开始 2 秒后播放首个角色的 CG）。
   ========================================================================== */

import { AppState } from './state.js?v=32';
import { CHARACTERS, getScene } from './scenes-data.js?v=32';
import { getPresent } from './schedules.js?v=32';
import { CloseupView } from './closeup.js?v=32';

/** 各角色开场问候池（[第 1 句, 第 2 句]） */
const GREETING_LINES = {
  siren:   ['（趴在鱼缸边，懒洋洋地吐着泡泡）主人……早安……', '今天也要出门打工吗？……要早点回来陪我泡水哦。'],
  caihong: ['早上好，主人！早餐已经准备好了，趁热吃吧。', '家里我都收拾干净啦，你安心出门就好。'],
  lingyi:  ['早——上好！今天也要元气满满哦！', '我刚晨跑回来，感觉超棒！你也要多运动呀。'],
  lushi:   ['（抬眼看了你一眼）……醒了？', '（目光又落回书页）早餐在桌上。'],
  kisikil: ['呀，主人早安！刚开播就遇到你，运气超好～', '要不要来直播间跟观众们打个招呼？'],
  lilla:   ['（半梦半醒地抬头）……嗯？是主人啊……', '（抱着鲨鱼玩偶蹭了蹭）再让我眯五分钟……'],
  ecclesia: ['早呀早呀！热腾腾的包子刚出笼，来一个嘛？', '吃饱了才有力气开始新的一天！'],
  tiantong: ['（躲在门后怯怯地探出半张脸）早、早上好……', '那个……今天路上要小、小心……'],
  li:      ['早安，愿今日的阳光与你同在。', '（双手交握在胸前，微微一笑）我会为你祈祷的。'],
};

/** 按场景生成旁白开场句（fallback 通用句） */
function buildIntro(sceneId, present) {
  var scene = getScene(sceneId);
  var sceneName = scene ? scene.name : '这里';
  if (present.length === 0) return `你来到${sceneName}，四下静悄悄的。`;
  var names = present.map(function (p) { return (CHARACTERS[p.charId] || {}).name || p.charId; }).join('和');
  return `你来到${sceneName}，${names}已经在了。`;
}

const OUTRO = '新的一天开始了。想去哪里、想做什么，随心而行吧。';

/**
 * 构建寒暄台词序列：[{ charId: string|null, speaker: string|null, text: string }]
 */
function buildLines(sceneId, present) {
  var lines = [];
  lines.push({ charId: null, speaker: null, text: buildIntro(sceneId, present) });
  present.forEach(function (p) {
    var meta = CHARACTERS[p.charId];
    var pool = GREETING_LINES[p.charId] || [`（${meta ? meta.name : p.charId}）……早上好。`, '今天也要一起加油哦。'];
    pool.forEach(function (text) {
      lines.push({ charId: p.charId, speaker: meta ? meta.name : p.charId, text: text });
    });
  });
  lines.push({ charId: null, speaker: null, text: OUTRO });
  return lines;
}

/** 寒暄进行中标记（防重入） */
var _playing = false;

/**
 * 播放开局寒暄（新游戏转场 onDone 调用；无人/已播/特写被关则静默跳过）
 */
export function playOpeningGreeting() {
  if (_playing) return;
  var state = AppState.get();
  var present = getPresent(state.currentSceneId, state.gameTime);
  if (!present.length) return;

  var lines = buildLines(state.currentSceneId, present);
  if (!lines.length) return;
  _playing = true;

  // 首个有台词的角色立绘登场（CG 按特写规则延迟播放）
  var firstChar = (lines.find(function (l) { return l.charId; }) || {}).charId || present[0].charId;
  CloseupView.open(firstChar);

  var dialogEl = CloseupView.getDialogEl();
  if (!dialogEl) { _playing = false; return; }
  dialogEl.innerHTML =
    '<div class="greeting-box" id="greeting-box">' +
      '<div class="greeting-speaker" id="greeting-speaker"></div>' +
      '<div class="greeting-text" id="greeting-text"></div>' +
      '<div class="greeting-hint">点击继续 ▸</div>' +
    '</div>';

  var speakerEl = document.getElementById('greeting-speaker');
  var textEl = document.getElementById('greeting-text');
  var overlay = document.getElementById('closeup-overlay');
  var idx = 0;

  // 特写被用户 Esc/关闭按钮关掉时中止寒暄
  var unsub = AppState.subscribe('closeup', function (closeup) {
    if (!closeup || !closeup.active) { abort(); }
  });

  function showLine() {
    var line = lines[idx];
    speakerEl.textContent = line.speaker || '';
    textEl.textContent = line.text;
    textEl.classList.remove('show');
    void textEl.offsetHeight; // 重启动画
    textEl.classList.add('show');
    if (idx === 0) {
      // 旁白首句 = 对话开始 → 通知特写层安排 2 秒后 CG
      CloseupView.onDialogueStarted();
    }
    if (line.charId) {
      var cur = AppState.get('closeup');
      if (!cur || cur.characterId !== line.charId) {
        CloseupView.switchCharacter(line.charId);
      }
    }
  }

  function advance() {
    idx++;
    if (idx >= lines.length) { finish(); return; }
    showLine();
  }

  function finish() {
    if (!_playing) return;
    _playing = false;
    if (unsub) unsub();
    if (overlay) overlay.removeEventListener('click', onClick);
    var d = CloseupView.getDialogEl();
    if (d) d.innerHTML = '';
    CloseupView.close();
  }

  function abort() {
    if (!_playing) return;
    _playing = false;
    if (unsub) unsub();
    if (overlay) overlay.removeEventListener('click', onClick);
    var d = CloseupView.getDialogEl();
    if (d) d.innerHTML = '';
  }

  function onClick(e) {
    if (e.target.closest('#closeup-close-btn')) return;
    advance();
  }

  overlay.addEventListener('click', onClick);
  showLine();
}
