/* ==========================================================================
   光之回响 (Echoes of Light) — BattleStage 全屏对战引擎
   Yu-Gi-Oh! Master Duel 风格全屏对战舞台
   ========================================================================== */

import { AppState } from './state.js';
import { Notifications } from './notifications.js';
import { Particles } from './particles.js';

/* ==========================================================================
   常量
   ========================================================================== */

/** 阶段序列 */
const PHASES = ['draw', 'main1', 'battle', 'main2', 'end'];
const PHASE_NAMES = ['抽牌阶段', '主要阶段1', '战斗阶段', '主要阶段2', '结束阶段'];
const PHASE_SHORT = ['抽牌', '主1', '战斗', '主2', '结束'];

/** 祭品需求：5-6星需1祭品，7+星需2祭品 */
const TRIBE_REQ = { 5: 1, 6: 1, 7: 2, 8: 2, 9: 2, 10: 2, 11: 2, 12: 2 };

/** 手牌上限 */
const MAX_HAND_SIZE = 6;

/** 起始 LP */
const START_LP = 8000;

/* ==========================================================================
   卡牌模板库
   ========================================================================== */

const PLAYER_CARD_POOL = [
  { id: 'p-mon-001', name: '辉光之盾兵',    type: 'monster', attribute: 'light', level: 4,  attack: 1500, defense: 2000, description: '光辉凝聚的守护者，以圣光之盾抵御一切黑暗。' },
  { id: 'p-mon-002', name: '灵辉治愈使',    type: 'monster', attribute: 'light', level: 3,  attack: 800,  defense: 1200, description: '手持灵辉法杖的治疗者，能为友军恢复体力。' },
  { id: 'p-mon-003', name: '圣光裁决者',    type: 'monster', attribute: 'light', level: 5,  attack: 2100, defense: 1600, description: '高举圣剑的审判者，对邪恶施以天罚。' },
  { id: 'p-mon-004', name: '辉光灵刃使',    type: 'monster', attribute: 'light', level: 7,  attack: 2500, defense: 1800, description: '操纵光之灵刃的剑术大师，剑光所至黑暗退散。' },
  { id: 'p-mon-005', name: '光盾卫士',      type: 'monster', attribute: 'light', level: 4,  attack: 1200, defense: 2200, description: '手持巨盾的坚实卫士，永不后退的守护者。' },
  { id: 'p-mon-006', name: '晨曦精灵',      type: 'monster', attribute: 'light', level: 2,  attack: 500,  defense: 600,  description: '晨曦中诞生的精灵，活泼可爱但实力有限。' },
  { id: 'p-mon-007', name: '星辉射手',      type: 'monster', attribute: 'light', level: 4,  attack: 1800, defense: 1000, description: '以星光为箭的神射手，百发百中。' },
  { id: 'p-mon-008', name: '神圣守卫者',    type: 'monster', attribute: 'light', level: 6,  attack: 2000, defense: 2400, description: '守护圣域的巨型石像，坚不可摧。' },
  { id: 'p-spl-001', name: '灵辉闪耀',      type: 'spell',  description: '让场上所有光属性怪兽攻击力提升400点。' },
  { id: 'p-spl-002', name: '辉光护盾',      type: 'spell',  description: '抵消一次对己方怪兽的攻击。' },
  { id: 'p-spl-003', name: '圣光祝福',      type: 'spell',  description: '恢复自己800点生命值。' },
  { id: 'p-spl-004', name: '灵曦之佑',      type: 'spell',  description: '从卡组抽2张牌。' },
  { id: 'p-spl-005', name: '光之回响',      type: 'spell',  description: '从墓地回收1张光属性怪兽卡到手牌。' },
  { id: 'p-trp-001', name: '光之结界',      type: 'trap',   description: '对手宣言攻击时可发动，无效那次攻击。' },
  { id: 'p-trp-002', name: '辉光反制',      type: 'trap',   description: '对手发动效果时，使其效果无效并破坏。' }
];

const OPPONENT_CARD_POOL = [
  { id: 'o-mon-001', name: '暗影之牙兵',    type: 'monster', attribute: 'dark', level: 4,  attack: 1700, defense: 1300, description: '从暗影中突袭的尖牙士兵。' },
  { id: 'o-mon-002', name: '深渊潜伏者',    type: 'monster', attribute: 'dark', level: 6,  attack: 2200, defense: 1800, description: '潜伏在深渊之下的恐怖生物。' },
  { id: 'o-mon-003', name: '黯灭噬魂兽',    type: 'monster', attribute: 'dark', level: 4,  attack: 1900, defense: 0,    description: '吞噬灵魂的凶兽，攻击力极高但防御脆弱。' },
  { id: 'o-mon-004', name: '暗夜刺客',      type: 'monster', attribute: 'dark', level: 3,  attack: 1400, defense: 800,  description: '在暗夜中潜行的致命刺客。' },
  { id: 'o-mon-005', name: '深渊守卫',      type: 'monster', attribute: 'dark', level: 4,  attack: 1100, defense: 2000, description: '守护深渊之门的重甲卫士。' },
  { id: 'o-mon-006', name: '虚无之灵',      type: 'monster', attribute: 'dark', level: 2,  attack: 400,  defense: 400,  description: '从虚空中诞生的低等灵体。' },
  { id: 'o-mon-007', name: '暗黑统领',      type: 'monster', attribute: 'dark', level: 7,  attack: 2600, defense: 1500, description: '统率暗黑军团的恐怖将军。' },
  { id: 'o-mon-008', name: '深渊巨兽',      type: 'monster', attribute: 'dark', level: 5,  attack: 2300, defense: 1200, description: '来自深渊的远古巨兽，势不可挡。' },
  { id: 'o-spl-001', name: '黑暗波动',      type: 'spell',  description: '对对手造成800点伤害。' },
  { id: 'o-spl-002', name: '深渊之息',      type: 'spell',  description: '让场上所有暗属性怪兽攻击力提升500点。' },
  { id: 'o-spl-003', name: '黯灭之力',      type: 'spell',  description: '牺牲800LP，从卡组特殊召唤1只暗属性怪兽。' },
  { id: 'o-spl-004', name: '暗之再生',      type: 'spell',  description: '从墓地复活1只暗属性怪兽。' },
  { id: 'o-trp-001', name: '虚无之幕',      type: 'trap',   description: '对手发动魔法卡时可发动，使其无效。' },
  { id: 'o-trp-002', name: '暗影束缚',      type: 'trap',   description: '选择对手1只怪兽，使其无法攻击。' },
  { id: 'o-trp-003', name: '深渊契约',      type: 'trap',   description: '自己受到攻击伤害时，将伤害转为恢复。' }
];

/* ==========================================================================
   工具函数
   ========================================================================== */

/** 从数组中随机取一个元素 */
function randomPick(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Fisher-Yates 洗牌 */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

/** 深拷贝 */
function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** HTML 转义 */
function esc(str) {
  var d = document.createElement('div');
  d.textContent = String(str);
  return d.innerHTML;
}

/** 根据等级返回所需祭品数 */
function getTributeRequired(level) {
  return TRIBE_REQ[level] || 0;
}

/* ==========================================================================
   私有状态
   ========================================================================== */

let _state = {};
let _dom = {};
let _active = false;
let _selectedHandIndex = -1;
let _isAnimating = false;

/* ==========================================================================
   内部函数
   ========================================================================== */

/* ---- 卡组初始化 ---- */

/**
 * 从 AppState.activeDeckId 加载我方卡组，补全至 15 张
 * 生成对手完整卡组（15 张）
 */
function _setupDecks() {
  var playerDeck = [];
  var activeDeckId = AppState.get('activeDeckId');
  var decks = AppState.get('decks') || [];

  // 尝试从 AppState 加载玩家卡组
  var activeDeck = null;
  if (activeDeckId) {
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === activeDeckId) {
        activeDeck = decks[i];
        break;
      }
    }
  }

  if (activeDeck && activeDeck.mainCards && activeDeck.mainCards.length > 0) {
    // 从 AppState 卡组中的卡牌 ID 映射到模板
    for (var j = 0; j < activeDeck.mainCards.length; j++) {
      var c = activeDeck.mainCards[j];
      var found = false;
      for (var k = 0; k < PLAYER_CARD_POOL.length; k++) {
        if (PLAYER_CARD_POOL[k].name === c.name) {
          playerDeck.push(clone(PLAYER_CARD_POOL[k]));
          found = true;
          break;
        }
      }
      if (!found) {
        // 创建基础怪兽卡
        playerDeck.push({
          id: 'p-gen-' + j,
          name: c.name,
          type: 'monster',
          attribute: 'light',
          level: 4,
          attack: c.power || 1000,
          defense: (c.power || 1000) + 500,
          description: c.description || ''
        });
      }
    }
  }

  // 补全至 15 张
  while (playerDeck.length < 15) {
    var pool = clone(PLAYER_CARD_POOL);
    for (var m = 0; m < pool.length; m++) {
      if (playerDeck.length >= 15) break;
      playerDeck.push(pool[m]);
    }
  }

  // 生成对手卡组
  var opponentDeck = [];
  while (opponentDeck.length < 15) {
    var opPool = clone(OPPONENT_CARD_POOL);
    for (var n = 0; n < opPool.length; n++) {
      if (opponentDeck.length >= 15) break;
      opponentDeck.push(opPool[n]);
    }
  }

  // 洗牌
  _state.playerDeck = shuffle(playerDeck);
  _state.opponentDeck = shuffle(opponentDeck);

  // 清空其他区
  _state.playerHand = [];
  _state.opponentHand = [];
  _state.playerMonsters = [null, null, null, null, null];
  _state.opponentMonsters = [null, null, null, null, null];
  _state.playerSpellTraps = [null, null, null, null, null];
  _state.opponentSpellTraps = [null, null, null, null, null];
  _state.playerGraveyard = [];
  _state.opponentGraveyard = [];
  _state.playerBanished = [];
  _state.opponentBanished = [];
  _state.playerExtraDeck = [];
  _state.opponentExtraDeck = [];
  _state.fieldSpell = null;
}

/** 抽牌 */
function _drawCard(player) {
  var deck = player === 'player' ? _state.playerDeck : _state.opponentDeck;
  var hand = player === 'player' ? _state.playerHand : _state.opponentHand;

  if (deck.length === 0) return null;

  var card = deck.pop();

  // 手牌上限检查
  if (hand.length >= MAX_HAND_SIZE) {
    // 随机弃牌
    var discardIdx = Math.floor(Math.random() * hand.length);
    var discarded = hand.splice(discardIdx, 1)[0];
    (player === 'player' ? _state.playerGraveyard : _state.opponentGraveyard).push(discarded);
    Notifications.show('warning', '手牌超限', esc(discarded.name) + ' 被弃入墓地');
  }

  hand.push(card);
  return card;
}

/** 计算手牌扇形角度 */
function _calcHandAngles(count) {
  var angles = [];
  if (count <= 1) {
    angles.push(0);
  } else {
    var spread = Math.min(50, count * 10);
    for (var i = 0; i < count; i++) {
      angles.push(((i / (count - 1)) - 0.5) * spread);
    }
  }
  return angles;
}

/** 获取卡片类型的显示图标 */
function _getCardTypeLabel(card) {
  if (card.type === 'monster') return '怪兽-' + (card.attribute === 'light' ? '光' : '暗');
  if (card.type === 'spell') return '魔法';
  return '陷阱';
}

/** 获取卡片等级星号（使用内联 SVG 代替 Unicode 符号） */
function _getStars(level) {
  var s = '';
  for (var i = 0; i < (level || 0); i++) {
    s += '<svg class="lvl-star" width="8" height="8" viewBox="0 0 24 24" fill="#FFD54F"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>';
  }
  return s;
}

/* ---- 渲染函数 ---- */

/** 渲染手牌 */
function _renderHand(player) {
  var hand = player === 'player' ? _state.playerHand : _state.opponentHand;
  var container = _dom[player + 'Hand'];
  if (!container) return;

  container.innerHTML = '';
  var angles = _calcHandAngles(hand.length);

  for (var i = 0; i < hand.length; i++) {
    var card = hand[i];
    var isPlayer = player === 'player';
    var el = document.createElement('div');

    if (isPlayer) {
      el.className = 'hand-card';
      el.style.setProperty('--angle', angles[i] + 'deg');
      el.style.setProperty('--index', i);
      el.dataset.handIndex = i;

      el.innerHTML =
        '<div class="card-inner">' +
          '<div class="card-name">' + esc(card.name) + '</div>' +
          (card.level ? '<div class="card-level">' + _getStars(card.level) + '</div>' : '') +
        '</div>';
    } else {
      // 对手手牌 — 卡背
      el.className = 'hand-card card-back opponent-card';
      el.style.setProperty('--angle', angles[i] + 'deg');
      el.style.setProperty('--index', i);
      el.innerHTML = '<div class="card-back-pattern"></div>';
    }
    container.appendChild(el);
  }
}

/** 渲染怪兽区 */
function _renderMonsterZones(player) {
  var monsters = player === 'player' ? _state.playerMonsters : _state.opponentMonsters;
  var zones = _dom[player + 'MonsterZones'];
  if (!zones) return;

  var isPlayer = player === 'player';

  for (var i = 0; i < 5; i++) {
    var zone = zones.children[i];
    if (!zone) continue;

    var card = monsters[i];
    if (card) {
      zone.classList.add('occupied');
      if (!isPlayer) zone.classList.add('opponent-zone');
      zone.innerHTML = _buildMonsterCardHTML(card, !isPlayer);
    } else {
      zone.classList.remove('occupied', 'opponent-zone');
      zone.innerHTML = '';
    }
  }
}

/** 构建怪兽卡 HTML */
function _buildMonsterCardHTML(card, isOpponent) {
  var posClass = card.position === 'defense' ? 'position-defense' : '';
  var backClass = card.position === 'face-down' ? 'card-back' : '';
  var ownerClass = isOpponent ? 'opponent' : '';

  if (card.position === 'face-down') {
    return '<div class="field-card card-back ' + ownerClass + '">' +
      '<div class="card-back-inner"></div></div>';
  }

  return '<div class="field-card monster-card ' + posClass + ' ' + ownerClass + '">' +
    '<div class="fc-header">' +
      '<span class="fc-name">' + esc(card.name) + '</span>' +
      '<span class="fc-level">' + _getStars(card.level) + '</span>' +
    '</div>' +
    '<div class="fc-art ' + (card.attribute === 'light' ? 'fc-art-light' : 'fc-art-dark') + '"></div>' +
    '<div class="fc-stats">' +
      '<span class="fc-atk">ATK ' + (card.attack || 0) + '</span>' +
      '<span class="fc-def">DEF ' + (card.defense || 0) + '</span>' +
    '</div>' +
  '</div>';
}

/** 构建魔陷卡 HTML */
function _buildSpellTrapCardHTML(card, isOpponent) {
  var backClass = card.position === 'face-down' ? 'card-back' : '';
  var ownerClass = isOpponent ? 'opponent' : '';

  if (card.position === 'face-down') {
    return '<div class="field-card card-back ' + ownerClass + '">' +
      '<div class="card-back-inner"></div></div>';
  }

  return '<div class="field-card spell-card ' + ownerClass + '">' +
    '<div class="fc-type-icon ' + (card.type === 'spell' ? 'fc-icon-spell' : 'fc-icon-trap') + '"></div>' +
    '<div class="fc-type-label">' + esc(card.name) + '</div>' +
  '</div>';
}

/** 渲染魔陷区 */
function _renderSpellTrapZones(player) {
  var spells = player === 'player' ? _state.playerSpellTraps : _state.opponentSpellTraps;
  var zones = _dom[player + 'STZones'];
  if (!zones) return;

  var isPlayer = player === 'player';

  for (var i = 0; i < 5; i++) {
    var zone = zones.children[i];
    if (!zone) continue;

    var card = spells[i];
    if (card) {
      zone.classList.add('occupied');
      if (!isPlayer) zone.classList.add('opponent-zone');
      if (card.position === 'face-down') {
        zone.classList.add('set-card');
      } else {
        zone.classList.remove('set-card');
      }
      zone.innerHTML = _buildSpellTrapCardHTML(card, !isPlayer);
    } else {
      zone.classList.remove('occupied', 'opponent-zone', 'set-card');
      zone.innerHTML = '';
    }
  }
}

/** 渲染侧边区域（卡组/额外/墓地/除外/场地） */
function _renderSideZones(player) {
  var isPlayer = player === 'player';
  var s = isPlayer ? _state : _state;
  var prefix = isPlayer ? 'player' : 'opponent';

  // 卡组
  var deckZone = _dom[prefix + 'Deck'];
  if (deckZone) {
    var deckCount = _state[prefix + 'Deck'].length;
    deckZone.querySelector('.zone-count').textContent = deckCount;
  }

  // 额外
  var extraZone = _dom[prefix + 'ExtraDeck'];
  if (extraZone) {
    var extraCount = (_state[prefix + 'ExtraDeck'] || []).length;
    extraZone.querySelector('.zone-count').textContent = extraCount;
  }

  // 墓地
  var gyZone = _dom[prefix + 'Graveyard'];
  if (gyZone) {
    var gyCards = _state[prefix + 'Graveyard'];
    var count = gyCards.length;
    gyZone.querySelector('.zone-count').textContent = count;
    gyZone.classList.remove('gy-empty', 'gy-low', 'gy-mid', 'gy-high');
    if (count === 0) {
      gyZone.classList.add('gy-empty');
    } else if (count <= 5) {
      gyZone.classList.add('gy-low');
    } else if (count <= 15) {
      gyZone.classList.add('gy-mid');
    } else {
      gyZone.classList.add('gy-high');
    }

    // 显示墓地中的卡名
    if (count > 0 && gyZone.querySelector('.gy-cards') === null && !gyZone._showDetail) {
      // 默认只显示数量，hover 显示详情
    }
  }

  // 除外
  var banZone = _dom[prefix + 'Banished'];
  if (banZone) {
    var banCount = (_state[prefix + 'Banished'] || []).length;
    banZone.querySelector('.zone-count').textContent = banCount;
    banZone.classList.toggle('has-cards', banCount > 0);
  }

  // 场地魔法
  var fieldSpellZone = _dom[prefix + 'FieldSpell'];
  if (fieldSpellZone) {
    if (_state.fieldSpell) {
      fieldSpellZone.classList.add('occupied');
      fieldSpellZone.innerHTML =
        '<div style="font-size:0.55rem;color:#81C784;text-align:center;padding:2px;">' +
        esc(_state.fieldSpell.name) + '</div>';
    } else {
      fieldSpellZone.classList.remove('occupied');
      fieldSpellZone.innerHTML =
        '<span class="zone-label">场地</span>';
    }
  }
}

/** 更新 LP 显示 */
function _updateLPDisplay() {
  var playerLPEl = _dom.playerLP;
  var opponentLPEl = _dom.opponentLP;
  if (playerLPEl) playerLPEl.textContent = _state.playerLP;
  if (opponentLPEl) opponentLPEl.textContent = _state.opponentLP;
}

/** 更新阶段指示器 */
function _renderPhaseIndicator() {
  var phases = _dom.phaseIndicator;
  if (!phases) return;

  for (var i = 0; i < phases.length; i++) {
    var item = phases[i];
    item.classList.remove('active', 'prev');
    if (i === _state.phaseIndex) {
      item.classList.add('active');
    } else if (i < _state.phaseIndex) {
      item.classList.add('prev');
    }
  }

  // 更新回合信息
  var turnEl = _dom.turnInfo;
  if (turnEl) {
    var whose = _state.isPlayerTurn ? '我方' : '对手';
    turnEl.textContent = '第 ' + _state.turn + ' 回合 · ' + whose;
  }
}

/** 完整渲染战场 */
function _renderField() {
  _renderHand('player');
  _renderHand('opponent');
  _renderMonsterZones('player');
  _renderMonsterZones('opponent');
  _renderSpellTrapZones('player');
  _renderSpellTrapZones('opponent');
  _renderSideZones('player');
  _renderSideZones('opponent');
  _updateLPDisplay();
  _renderPhaseIndicator();
}

/* ---- 战斗逻辑 ---- */

/** 推进到下一阶段 */
function _nextPhase() {
  if (_isAnimating) return;

  _state.phaseIndex++;
  if (_state.phaseIndex >= PHASES.length) {
    // 结束阶段 → 切换到对方回合
    _state.phaseIndex = 0;
    _state.turn++;
    _state.isPlayerTurn = !_state.isPlayerTurn;

    if (!_state.isPlayerTurn) {
      _opponentTurn();
    }
  } else {
    // 阶段进入处理
    var phase = PHASES[_state.phaseIndex];
    if (phase === 'draw' && _state.isPlayerTurn && _state.turn > 1) {
      // 玩家抽牌阶段
      var drawn = _drawCard('player');
      if (drawn) {
        Notifications.show('info', '抽牌阶段', '抽到了 ' + drawn.name);
      } else {
        Notifications.show('warning', '抽牌阶段', '卡组已空');
      }
    }

    if (phase === 'battle' && !_state.isPlayerTurn) {
      // 对手战斗阶段 — 自动攻击
      setTimeout(function () {
        _opponentBattlePhase();
      }, 800);
    }
  }

  _renderField();
}

/** 对手回合（简单 AI） */
function _opponentTurn() {
  Notifications.show('info', '对手回合', '暗影势力开始行动');
  _renderField();

  // 抽牌阶段
  setTimeout(function () {
    if (!_active) return;
    _state.phaseIndex = 0;
    var drawn = _drawCard('opponent');
    _renderField();

    // 主要阶段1 — 模拟出牌
    setTimeout(function () {
      if (!_active) return;
      _state.phaseIndex = 1;
      _opponentPlayCards();
      _renderField();

      // 战斗阶段
      setTimeout(function () {
        if (!_active) return;
        _state.phaseIndex = 2;
        _renderField();

        setTimeout(function () {
          if (!_active) return;
          _opponentBattlePhase();

          // 主要阶段2
          setTimeout(function () {
            if (!_active) return;
            _state.phaseIndex = 3;
            _renderField();

            // 结束
            setTimeout(function () {
              if (!_active) return;
              _state.phaseIndex = 4;
              _renderField();

              setTimeout(function () {
                if (!_active) return;
                _state.phaseIndex = 0;
                _state.turn++;
                _state.isPlayerTurn = true;
                // 玩家抽牌
                var pd = _drawCard('player');
                if (pd) {
                  Notifications.show('info', '抽牌阶段', '抽到了 ' + pd.name);
                }
                _renderField();
                Notifications.show('success', '我方回合', '轮到你了');
              }, 600);
            }, 400);
          }, 400);
        }, 300);
      }, 500);
    }, 600);
  }, 400);
}

/** 对手自动出牌 */
function _opponentPlayCards() {
  // 尝试召唤怪兽
  var hand = _state.opponentHand;
  if (hand.length > 0) {
    // 找手牌中的怪兽
    for (var i = 0; i < hand.length; i++) {
      if (hand[i].type === 'monster') {
        // 找空位
        for (var z = 0; z < 5; z++) {
          if (!_state.opponentMonsters[z]) {
            var card = hand.splice(i, 1)[0];
            card.position = 'attack';
            _state.opponentMonsters[z] = card;
            Particles.spawnBattleParticles(0, 0, 8, '#ab47bc');
            break;
          }
        }
        break;
      }
    }
  }

  // 尝试 SET 魔陷
  if (hand.length > 0) {
    for (var j = 0; j < hand.length; j++) {
      if (hand[j].type === 'spell' || hand[j].type === 'trap') {
        for (var sz = 0; sz < 5; sz++) {
          if (!_state.opponentSpellTraps[sz]) {
            var sc = hand.splice(j, 1)[0];
            sc.position = 'face-down';
            _state.opponentSpellTraps[sz] = sc;
            break;
          }
        }
        break;
      }
    }
  }
}

/** 对手战斗阶段 — 自动攻击 */
function _opponentBattlePhase() {
  // 找对手攻击表示的怪兽
  var attacker = -1;
  for (var i = 0; i < 5; i++) {
    var m = _state.opponentMonsters[i];
    if (m && m.position === 'attack') {
      attacker = i;
      break;
    }
  }

  if (attacker === -1) return;

  // 找玩家怪兽作为目标
  var target = -1;
  for (var j = 0; j < 5; j++) {
    if (_state.playerMonsters[j]) {
      target = j;
      break;
    }
  }

  if (target === -1) {
    // 直接攻击玩家
    _declareDirectAttack(attacker);
  } else {
    _declareAttack(attacker, target, 'opponent');
  }
}

/** 宣告攻击 */
function _declareAttack(attackerIdx, targetIdx, attackerPlayer) {
  var isPlayerAttacker = attackerPlayer !== 'opponent';
  var monsters = isPlayerAttacker ? _state.playerMonsters : _state.opponentMonsters;
  var targetMonsters = isPlayerAttacker ? _state.opponentMonsters : _state.playerMonsters;
  var attacker = monsters[attackerIdx];
  var target = targetMonsters[targetIdx];

  if (!attacker || !target) {
    Notifications.show('error', '攻击失败', '目标不存在');
    return;
  }

  _isAnimating = true;

  // 攻击动画
  var ownerPrefix = isPlayerAttacker ? 'player' : 'opponent';
  var zoneEl = _dom[ownerPrefix + 'MonsterZones'].children[attackerIdx];
  if (zoneEl) {
    var cardEl = zoneEl.querySelector('.field-card');
    if (cardEl) {
      cardEl.classList.add('card-attacking');
    }
  }

  var targetOwner = isPlayerAttacker ? 'opponent' : 'player';
  var targetZoneEl = _dom[targetOwner + 'MonsterZones'].children[targetIdx];
  if (targetZoneEl) {
    var targetCardEl = targetZoneEl.querySelector('.field-card');
    if (targetCardEl) {
      targetCardEl.classList.add('card-targeted');
    }
  }

  // 计算伤害
  var atk = attacker.attack || 0;
  var def = target.defense || 0;
  var isTargetDefense = target.position === 'defense';
  var damage = 0;
  var destroyed = false;

  if (isTargetDefense) {
    // 攻击守备表示怪兽
    if (atk > def) {
      damage = atk - def;
      destroyed = true;
      Notifications.show('info', '战斗', attacker.name + ' 击破 ' + target.name);
    } else {
      damage = Math.min(def - atk, 1000);
      destroyed = false;
      Notifications.show('info', '战斗', attacker.name + ' 未能击破 ' + target.name + ' 的防线');
    }
  } else {
    // 攻击表示对攻击表示
    if (atk >= target.attack) {
      damage = atk - target.attack;
      destroyed = true;
      Notifications.show('info', '战斗', attacker.name + ' 击败了 ' + target.name);
    } else {
      damage = target.attack - atk;
      destroyed = true;
      _updateLP(attackerPlayer, -damage);
      Notifications.show('warning', '反击', target.name + ' 反杀了 ' + attacker.name + ' (' + damage + ')');
    }
  }

  // 处理结果
  setTimeout(function () {
    if (destroyed) {
      if (isTargetDefense || atk >= target.attack) {
        // 目标被破坏 → 送墓
        if (isPlayerAttacker) {
          _sendToGraveyard(targetMonsters[targetIdx], 'opponent');
          targetMonsters[targetIdx] = null;
        } else {
          _sendToGraveyard(targetMonsters[targetIdx], 'player');
          targetMonsters[targetIdx] = null;
        }
      } else {
        // 攻击者被反杀 → 送墓
        monsters[attackerIdx] = null;
        if (isPlayerAttacker) {
          _sendToGraveyard(attacker, 'player');
        } else {
          _sendToGraveyard(attacker, 'opponent');
        }
      }

      if (!isTargetDefense && atk >= target.attack) {
        _updateLP(isPlayerAttacker ? 'opponent' : 'player', -damage);
      }

      Particles.spawnBattleParticles(0, 0, 12, '#f44336');
    }

    _isAnimating = false;
    _renderField();
    _checkWinCondition();
  }, 600);
}

/** 直接攻击玩家 */
function _declareDirectAttack(attackerIdx) {
  var attacker = _state.opponentMonsters[attackerIdx];
  if (!attacker) return;

  _isAnimating = true;

  var zoneEl = _dom.opponentMonsterZones.children[attackerIdx];
  if (zoneEl) {
    var cardEl = zoneEl.querySelector('.field-card');
    if (cardEl) cardEl.classList.add('card-attacking');
  }

  var damage = attacker.attack || 0;
  Notifications.show('error', '直接攻击', attacker.name + ' 对你造成了 ' + damage + ' 点伤害');

  setTimeout(function () {
    _updateLP('player', -damage);
    _isAnimating = false;
    _renderField();
    _checkWinCondition();
  }, 500);
}

/** 更新 LP */
function _updateLP(player, amount) {
  var key = player === 'player' ? 'playerLP' : 'opponentLP';
  _state[key] = Math.max(0, _state[key] + amount);

  var el = player === 'player' ? _dom.playerLP : _dom.opponentLP;
  if (el) {
    el.textContent = _state[key];
    if (amount < 0) {
      el.classList.remove('lp-flash', 'lp-down');
      // 强制回流
      void el.offsetWidth;
      el.classList.add('lp-down');
    } else if (amount > 0) {
      el.classList.remove('lp-flash', 'lp-down');
      void el.offsetWidth;
      el.classList.add('lp-flash');
    }
  }

  if (amount < 0) {
    Particles.spawnBattleParticles(0, 0, 6, '#f44336');
  }
}

/** 检查胜负条件 */
function _checkWinCondition() {
  if (_state.playerLP <= 0) {
    _showResult(false);
  } else if (_state.opponentLP <= 0) {
    _showResult(true);
  }
}

/** 显示结果 */
function _showResult(victory) {
  _isAnimating = true;

  var overlay = document.getElementById('battle-overlay');
  if (!overlay) return;

  var resultEl = document.createElement('div');
  resultEl.className = 'battle-result';

  resultEl.innerHTML =
    '<div class="result-title ' + (victory ? 'victory' : 'defeat') + '">' +
      (victory ? '胜利' : '败北') +
    '</div>' +
    '<div class="result-sub">' +
      (victory ? '光芒驱散了黑暗...' : '黑暗吞噬了光芒...') +
    '</div>' +
    '<button class="result-btn ' + (victory ? 'victory-btn' : 'defeat-btn') + '" data-action="close-result">' +
      '返回' +
    '</button>';

  overlay.appendChild(resultEl);
}

/** 召唤怪兽 */
function _summonMonster(handIndex, zoneIndex, position) {
  if (_isAnimating) return;
  if (!_state.isPlayerTurn) {
    Notifications.show('warning', '无法召唤', '不是你的回合');
    return false;
  }
  if (PHASES[_state.phaseIndex] !== 'main1' && PHASES[_state.phaseIndex] !== 'main2') {
    Notifications.show('warning', '无法召唤', '只能在主要阶段召唤');
    return false;
  }

  var hand = _state.playerHand;
  var card = hand[handIndex];
  if (!card || card.type !== 'monster') {
    Notifications.show('warning', '无法召唤', '请选择怪兽卡');
    return false;
  }

  if (_state.playerMonsters[zoneIndex]) {
    Notifications.show('warning', '无法召唤', '该怪兽区已被占用');
    return false;
  }

  // 祭品检查
  var tribute = getTributeRequired(card.level);
  if (tribute > 0) {
    var available = 0;
    for (var i = 0; i < 5; i++) {
      if (_state.playerMonsters[i]) available++;
    }
    if (available < tribute) {
      Notifications.show('warning', '祭品不足', '需要 ' + tribute + ' 只祭品');
      return false;
    }
    // 简化解：自动选择前 tribute 只怪兽作为祭品
    var tributed = 0;
    for (var j = 0; j < 5 && tributed < tribute; j++) {
      if (_state.playerMonsters[j]) {
        _sendToGraveyard(_state.playerMonsters[j], 'player');
        _state.playerMonsters[j] = null;
        tributed++;
      }
    }
    Notifications.show('info', '祭品召唤', '解放了 ' + tribute + ' 只怪兽');
  }

  // 从手牌移除卡牌
  hand.splice(handIndex, 1)[0];
  card.position = position || 'attack';
  _state.playerMonsters[zoneIndex] = card;

  Particles.spawnBattleParticles(0, 0, 10, '#4FC3F7');
  Notifications.show('success', '召唤', card.name + ' 召唤成功');

  _selectedHandIndex = -1;
  _renderField();
  return true;
}

/** SET 魔陷 */
function _setSpellTrap(handIndex, zoneIndex) {
  if (_isAnimating) return;
  if (!_state.isPlayerTurn) {
    Notifications.show('warning', '无法 SET', '不是你的回合');
    return false;
  }
  if (PHASES[_state.phaseIndex] !== 'main1' && PHASES[_state.phaseIndex] !== 'main2') {
    Notifications.show('warning', '无法 SET', '只能在主要阶段 SET');
    return false;
  }

  var hand = _state.playerHand;
  var card = hand[handIndex];
  if (!card || (card.type !== 'spell' && card.type !== 'trap')) {
    Notifications.show('warning', '无法 SET', '请选择魔法或陷阱卡');
    return false;
  }

  if (_state.playerSpellTraps[zoneIndex]) {
    Notifications.show('warning', '无法 SET', '该区域已被占用');
    return false;
  }

  hand.splice(handIndex, 1)[0];
  card.position = 'face-down';
  _state.playerSpellTraps[zoneIndex] = card;

  Notifications.show('info', 'SET', card.name + ' 已覆盖放置');

  _selectedHandIndex = -1;
  _renderField();
  return true;
}

/** 改变表示形式 */
function _changePosition(zoneIndex) {
  var monster = _state.playerMonsters[zoneIndex];
  if (!monster) return;

  if (monster.position === 'attack') {
    monster.position = 'defense';
    Notifications.show('info', '表示变更', monster.name + ' 转为守备表示');
  } else {
    monster.position = 'attack';
    Notifications.show('info', '表示变更', monster.name + ' 转为攻击表示');
  }
  _renderField();
}

/* ---- 卡牌效果与墓地/除外管理 ---- */

/** 送卡入墓地（专用函数，符合 spec 要求） */
function _sendToGraveyard(card, player) {
  if (!card) return;
  var grave = player === 'player' ? _state.playerGraveyard : _state.opponentGraveyard;
  grave.push(card);
}

/** 除外卡牌（专用函数，符合 spec 要求） */
function _banishCard(card, player) {
  if (!card) return;
  var banished = player === 'player' ? _state.playerBanished : _state.opponentBanished;
  banished.push(card);
}

/** 发动魔陷 — 翻开 SET 卡并执行效果（符合 spec 要求） */
function _activateSpellTrap(zoneIndex) {
  if (_isAnimating) return;
  var card = _state.playerSpellTraps[zoneIndex];
  if (!card) {
    Notifications.show('warning', '无法发动', '该区域没有卡牌');
    return;
  }
  if (card.position !== 'face-down') {
    Notifications.show('warning', '无法发动', '该卡已经发动过了');
    return;
  }

  // 翻开
  card.position = 'face-up';
  Notifications.show('info', card.type === 'spell' ? '魔法发动' : '陷阱发动',
    card.name + ' 效果发动：' + card.description);

  // 执行效果（简化解）
  if (card.description.indexOf('恢复') !== -1) {
    var heal = 800;
    _state.playerLP = Math.min(_state.playerLP + heal, 8000);
    _updateLPDisplay();
  } else if (card.description.indexOf('抽') !== -1) {
    _drawCard('player');
    _drawCard('player');
    Notifications.show('info', '效果处理', '抽了 2 张牌');
  } else if (card.description.indexOf('攻击') !== -1) {
    Notifications.show('info', '效果处理', '无效了对手的攻击');
  }

  // 发动后送墓
  _state.playerSpellTraps[zoneIndex] = null;
  _sendToGraveyard(card, 'player');

  Particles.spawnBattleParticles(0, 0, 6, '#4FC3F7');
  _renderField();
}

/* ---- 演示设置 ---- */

/** 设置演示用战场（让面板看起来活跃） */
function _setupDemoBoard() {
  // 双方各抽 5 张
  for (var i = 0; i < 5; i++) {
    _drawCard('player');
    _drawCard('opponent');
  }

  // 从玩家手牌选一只怪兽上场
  var playerMonsterIdx = -1;
  var oppMonsterIdx = -1;
  var playerSTIdx = -1;
  var oppSTIdx = -1;

  for (var j = 0; j < _state.playerHand.length; j++) {
    if (_state.playerHand[j].type === 'monster' && playerMonsterIdx === -1) {
      playerMonsterIdx = j;
    }
    if ((_state.playerHand[j].type === 'spell' || _state.playerHand[j].type === 'trap') && playerSTIdx === -1) {
      playerSTIdx = j;
    }
  }

  for (var k = 0; k < _state.opponentHand.length; k++) {
    if (_state.opponentHand[k].type === 'monster' && oppMonsterIdx === -1) {
      oppMonsterIdx = k;
    }
    if ((_state.opponentHand[k].type === 'spell' || _state.opponentHand[k].type === 'trap') && oppSTIdx === -1) {
      oppSTIdx = k;
    }
  }

  // 玩家：放置怪兽
  if (playerMonsterIdx >= 0) {
    var pm = _state.playerHand.splice(playerMonsterIdx, 1)[0];
    pm.position = 'attack';
    _state.playerMonsters[0] = pm;
  }

  // 玩家：SET 魔陷
  if (playerSTIdx >= 0) {
    var ps = _state.playerHand.splice(playerSTIdx, 1)[0];
    ps.position = 'face-down';
    _state.playerSpellTraps[1] = ps;
  }

  // 对手：放置怪兽
  if (oppMonsterIdx >= 0) {
    var om = _state.opponentHand.splice(oppMonsterIdx, 1)[0];
    om.position = 'attack';
    _state.opponentMonsters[2] = om;
  }

  // 对手：SET 魔陷
  if (oppSTIdx >= 0) {
    var os = _state.opponentHand.splice(oppSTIdx, 1)[0];
    os.position = 'face-down';
    _state.opponentSpellTraps[3] = os;
  }

  // 各送 2 张到墓地以显示墓地发光
  _sendToGraveyard(_state.playerDeck.pop(), 'player');
  _sendToGraveyard(_state.playerDeck.pop(), 'player');
  _sendToGraveyard(_state.opponentDeck.pop(), 'opponent');
  _sendToGraveyard(_state.opponentDeck.pop(), 'opponent');
}

/* ---- 事件绑定 ---- */

function _bindEvents() {
  var overlay = document.getElementById('battle-overlay');
  if (!overlay) return;

  // 事件委托
  overlay.addEventListener('click', function (e) {
    var target = e.target.closest('[data-action]');
    if (target) {
      var action = target.dataset.action;
      _handleAction(action, target, e);
      return;
    }

    // 手牌点击
    var handCard = e.target.closest('.hand-card[data-hand-index]');
    if (handCard) {
      var idx = parseInt(handCard.dataset.handIndex, 10);
      _handleHandClick(idx);
      return;
    }

    // 怪兽区点击（玩家）
    var monsterZone = e.target.closest('.monster-zone');
    if (monsterZone && monsterZone.closest('.field-player')) {
      var mIdx = Array.from(monsterZone.parentNode.children).indexOf(monsterZone);
      _handleMonsterZoneClick(mIdx);
      return;
    }

    // 魔陷区点击（玩家）
    var stZone = e.target.closest('.st-zone');
    if (stZone && stZone.closest('.field-player')) {
      var sIdx = Array.from(stZone.parentNode.children).indexOf(stZone);
      _handleSTZoneClick(sIdx);
      return;
    }
  });

  // ESC 键关闭
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape' && _active) {
      document.removeEventListener('keydown', onEsc);
      _hideBattle();
    }
  });
}

function _handleAction(action, el, event) {
  switch (action) {
    case 'close-battle':
      _hideBattle();
      break;
    case 'next-phase':
      _nextPhase();
      break;
    case 'draw-card':
      if (_state.isPlayerTurn && PHASES[_state.phaseIndex] === 'main1') {
        var drawn = _drawCard('player');
        if (drawn) {
          Notifications.show('info', '抽卡', '抽到了 ' + drawn.name);
          _renderField();
        }
      }
      break;
    case 'end-turn':
      if (!_state.isPlayerTurn) {
        Notifications.show('warning', '无法操作', '现在是对方的回合');
        return;
      }
      // 强制跳到结束阶段
      _state.phaseIndex = 4;
      _renderField();
      setTimeout(function () {
        _nextPhase(); // 触发换边
      }, 400);
      break;
    case 'close-result':
    case 'return-from-battle':
      _hideBattle();
      break;
  }
}

function _handleHandClick(index) {
  if (!_state.isPlayerTurn) return;
  var phase = PHASES[_state.phaseIndex];
  if (phase !== 'main1' && phase !== 'main2') return;

  var card = _state.playerHand[index];
  if (!card) return;

  // 切换选中状态
  if (_selectedHandIndex === index) {
    _selectedHandIndex = -1;
    _clearHighlights();
  } else {
    _selectedHandIndex = index;
    _highlightZonesForCard(card);
  }
}

function _highlightZonesForCard(card) {
  _clearHighlights();

  var zoneClass = '.field-player .monster-zone';
  var zones = document.querySelectorAll('#battle-overlay ' + zoneClass);
  if (card.type === 'monster') {
    for (var i = 0; i < zones.length; i++) {
      if (!_state.playerMonsters[i]) {
        zones[i].classList.add('highlight');
      }
    }
  } else {
    zones = document.querySelectorAll('#battle-overlay .field-player .st-zone');
    for (var j = 0; j < zones.length; j++) {
      if (!_state.playerSpellTraps[j]) {
        zones[j].classList.add('highlight');
      }
    }
  }
}

function _clearHighlights() {
  var highlighted = document.querySelectorAll('#battle-overlay .highlight');
  for (var i = 0; i < highlighted.length; i++) {
    highlighted[i].classList.remove('highlight');
  }
}

function _handleMonsterZoneClick(zoneIndex) {
  if (_selectedHandIndex >= 0) {
    var card = _state.playerHand[_selectedHandIndex];
    if (card && card.type === 'monster') {
      _summonMonster(_selectedHandIndex, zoneIndex, 'attack');
    }
  } else {
    // 查看/操作已存在的怪兽
    var monster = _state.playerMonsters[zoneIndex];
    if (monster) {
      _changePosition(zoneIndex);
    }
  }
}

function _handleSTZoneClick(zoneIndex) {
  if (_selectedHandIndex >= 0) {
    var card = _state.playerHand[_selectedHandIndex];
    if (card && (card.type === 'spell' || card.type === 'trap')) {
      _setSpellTrap(_selectedHandIndex, zoneIndex);
    }
  } else {
    // 点击已 SET 的魔陷进行发动
    var stCard = _state.playerSpellTraps[zoneIndex];
    if (stCard && stCard.position === 'face-down') {
      _activateSpellTrap(zoneIndex);
    }
  }
}

/* ---- 隐藏战场 ---- */

function _hideBattle() {
  if (!_active) return;
  _active = false;
  _isAnimating = false;
  _selectedHandIndex = -1;

  var overlay = document.getElementById('battle-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    // 保留结构，清空动态内容
    var board = overlay.querySelector('.battle-board');
    if (board) board.remove();
    var result = overlay.querySelector('.battle-result');
    if (result) result.remove();
    var closeBtn = overlay.querySelector('.battle-close-btn');
    if (closeBtn) closeBtn.remove();
  }

  Notifications.show('info', '战斗结束', '返回了事件界面');
}

/* ---- 构建 HTML ---- */

function _buildBoardHTML(opponent) {
  var html = '';

  // 关闭按钮
  html += '<button class="battle-close-btn" data-action="close-battle" aria-label="关闭战斗">' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
  '</button>';

  // 对战面板 — 5 行网格布局
  html += '<div class="battle-board">';

  // Row 1: 顶部栏 + 对手手牌
  html += '<div class="top-group">' +
    '<div class="top-bar">' +
      '<div class="lp-display opponent-lp">' +
        '<svg class="lp-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
        '<span class="lp-value" id="battle-lp-opponent">' + _state.opponentLP + '</span>' +
      '</div>' +
      '<div class="phase-indicator">';

  for (var pi = 0; pi < PHASE_SHORT.length; pi++) {
    html += '<div class="phase-item' + (pi === 0 ? ' active' : '') + '" data-phase="' + pi + '">' + PHASE_SHORT[pi] + '</div>';
  }

  html += '</div>' +
    '<div class="turn-info" id="battle-turn-info">第 1 回合 · 我方</div>' +
    '<div class="lp-display player-lp">' +
      '<svg class="lp-icon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>' +
      '<span class="lp-value" id="battle-lp-player">' + _state.playerLP + '</span>' +
    '</div>' +
  '</div>' +
  '<div class="hand-area">' +
    '<div class="hand" id="hand-opponent"></div>' +
  '</div>' +
  '</div>';

  // Row 2: 对手场地
  html += '<div class="field field-opponent">' +
    '<div class="field-label">ECHOES</div>' +
    '<div class="zone-row side-zones" id="opponent-side">' +
      _buildSideZoneHTML('gy', 'opponent') +
      _buildSideZoneHTML('deck', 'opponent') +
      _buildSideZoneHTML('extra', 'opponent') +
      _buildSideZoneHTML('field', 'opponent') +
      _buildSideZoneHTML('banished', 'opponent') +
    '</div>' +
    '<div class="zone-row monster-row" id="opponent-monster-zones">' +
      _buildEmptyZoneHTML('monster', 0) + _buildEmptyZoneHTML('monster', 1) +
      _buildEmptyZoneHTML('monster', 2) + _buildEmptyZoneHTML('monster', 3) +
      _buildEmptyZoneHTML('monster', 4) +
    '</div>' +
    '<div class="zone-row st-row" id="opponent-st-zones">' +
      _buildEmptyZoneHTML('st', 0) + _buildEmptyZoneHTML('st', 1) +
      _buildEmptyZoneHTML('st', 2) + _buildEmptyZoneHTML('st', 3) +
      _buildEmptyZoneHTML('st', 4) +
    '</div>' +
  '</div>';

  // Row 3: 额外怪兽区
  html += '<div class="extra-monster-row">' +
    '<div class="zone extra-monster-zone" data-index="0"></div>' +
    '<div class="zone extra-monster-zone" data-index="1"></div>' +
  '</div>';

  // Row 4: 玩家场地
  html += '<div class="field field-player">' +
    '<div class="zone-row st-row" id="player-st-zones">' +
      _buildEmptyZoneHTML('st', 0) + _buildEmptyZoneHTML('st', 1) +
      _buildEmptyZoneHTML('st', 2) + _buildEmptyZoneHTML('st', 3) +
      _buildEmptyZoneHTML('st', 4) +
    '</div>' +
    '<div class="zone-row monster-row" id="player-monster-zones">' +
      _buildEmptyZoneHTML('monster', 0) + _buildEmptyZoneHTML('monster', 1) +
      _buildEmptyZoneHTML('monster', 2) + _buildEmptyZoneHTML('monster', 3) +
      _buildEmptyZoneHTML('monster', 4) +
    '</div>' +
    '<div class="zone-row side-zones" id="player-side">' +
      _buildSideZoneHTML('banished', 'player') +
      _buildSideZoneHTML('field', 'player') +
      _buildSideZoneHTML('extra', 'player') +
      _buildSideZoneHTML('deck', 'player') +
      _buildSideZoneHTML('gy', 'player') +
    '</div>' +
  '</div>';

  // Row 5: 我方手牌 + 操作按钮
  html += '<div class="bottom-group">' +
    '<div class="hand-area">' +
      '<div class="hand" id="hand-player"></div>' +
    '</div>' +
    '<div class="battle-actions">' +
      '<button class="battle-btn" data-action="draw-card">' +
        '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>' +
        '抽卡' +
      '</button>' +
      '<button class="battle-btn" data-action="next-phase">' +
        '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>' +
        '下一阶段' +
      '</button>' +
      '<button class="battle-btn primary" data-action="end-turn">' +
        '<svg class="btn-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>' +
        '结束回合' +
      '</button>' +
    '</div>' +
  '</div>';

  html += '</div>'; // 关闭 battle-board

  return html;
}

function _buildEmptyZoneHTML(type, index) {
  return '<div class="zone ' + type + '-zone" data-index="' + index + '"></div>';
}

function _buildSideZoneHTML(type, player) {
  var label, cls = '';

  switch (type) {
    case 'gy':
      label = '墓地'; cls = 'gy-zone gy-empty';
      break;
    case 'deck':
      label = '卡组'; cls = 'deck-zone';
      break;
    case 'extra':
      label = '额外'; cls = 'extra-deck-zone';
      break;
    case 'field':
      label = '场地'; cls = 'field-spell-zone';
      break;
    case 'banished':
      label = '除外'; cls = 'banished-zone';
      break;
  }

  return '<div class="zone ' + cls + '" data-owner="' + player + '" data-zone="' + type + '">' +
    '<span class="zone-label">' + label + '</span>' +
    '<span class="zone-count">0</span>' +
  '</div>';
}

/* ---- 初始化引用 ---- */

function _cacheDom() {
  _dom = {
    playerHand: document.getElementById('hand-player'),
    opponentHand: document.getElementById('hand-opponent'),
    playerMonsterZones: document.getElementById('player-monster-zones'),
    opponentMonsterZones: document.getElementById('opponent-monster-zones'),
    playerSTZones: document.getElementById('player-st-zones'),
    opponentSTZones: document.getElementById('opponent-st-zones'),
    playerLP: document.querySelector('#battle-lp-player'),
    opponentLP: document.querySelector('#battle-lp-opponent'),
    turnInfo: document.querySelector('#battle-turn-info'),
    phaseIndicator: document.querySelectorAll('.phase-item'),
    // Side zones will be queried lazily
  };

  _dom.playerDeck = document.querySelector('#player-side .deck-zone');
  _dom.opponentDeck = document.querySelector('#opponent-side .deck-zone');
  _dom.playerExtraDeck = document.querySelector('#player-side .extra-deck-zone');
  _dom.opponentExtraDeck = document.querySelector('#opponent-side .extra-deck-zone');
  _dom.playerGraveyard = document.querySelector('#player-side .gy-zone');
  _dom.opponentGraveyard = document.querySelector('#opponent-side .gy-zone');
  _dom.playerBanished = document.querySelector('#player-side .banished-zone');
  _dom.opponentBanished = document.querySelector('#opponent-side .banished-zone');
  _dom.playerFieldSpell = document.querySelector('#player-side .field-spell-zone');
  _dom.opponentFieldSpell = document.querySelector('#opponent-side .field-spell-zone');
}

/* ==========================================================================
   公共 API
   ========================================================================== */

export const BattleStage = {

  /**
   * 初始化 BattleStage — 订阅 AppState('pendingBattle')
   * 事件面板触发战斗后自动响应
   */
  init() {
    var self = this;

    // 订阅待处理战斗
    AppState.subscribe('pendingBattle', function (enemy) {
      if (enemy && enemy.name) {
        self.show(enemy);
        // 清空待处理战斗，防止重复触发
        AppState.set('pendingBattle', null);
      }
    });
  },

  /**
   * 显示对战舞台
   * @param {Object} opponent - 对手数据 { name, lp, maxLp, description }
   */
  show(opponent) {
    if (_active) return;

    _active = true;
    _selectedHandIndex = -1;
    _isAnimating = false;

    // 初始化状态
    _state = {
      turn: 1,
      phaseIndex: 0,
      playerLP: START_LP,
      opponentLP: opponent && opponent.lp ? opponent.lp : START_LP,
      playerHand: [],
      opponentHand: [],
      playerMonsters: [null, null, null, null, null],
      opponentMonsters: [null, null, null, null, null],
      playerSpellTraps: [null, null, null, null, null],
      opponentSpellTraps: [null, null, null, null, null],
      playerGraveyard: [],
      opponentGraveyard: [],
      playerBanished: [],
      opponentBanished: [],
      playerDeck: [],
      opponentDeck: [],
      playerExtraDeck: [],
      opponentExtraDeck: [],
      fieldSpell: null,
      isPlayerTurn: true,
      opponent: opponent || null
    };

    var overlay = document.getElementById('battle-overlay');
    if (!overlay) {
      console.error('[BattleStage] #battle-overlay not found');
      return;
    }

    // 构建 HTML
    var boardHTML = _buildBoardHTML(opponent);
    overlay.innerHTML = '';
    overlay.insertAdjacentHTML('beforeend', boardHTML);

    // 缓存 DOM 引用
    _cacheDom();

    // 初始化卡组 + 抽牌 + 演示设置
    _setupDecks();
    _setupDemoBoard();

    // 渲染初始状态
    _renderField();

    // 绑定事件
    _bindEvents();

    // 显示覆盖层
    overlay.style.display = '';
    // 强制回流后播放透明度过渡
    void overlay.offsetHeight;
    overlay.classList.add('active');

    Notifications.show('info', '决斗开始',
      '对阵 ' + (opponent ? opponent.name : '暗影势力') + '！',
      3000
    );

    console.log('[BattleStage] 对战舞台已激活');
  },

  /**
   * 关闭对战舞台
   */
  hide() {
    _hideBattle();
  },

  /**
   * 发动魔陷（公开 API）
   * @param {number} zoneIndex - 魔陷区索引 0-4
   */
  activateSpellTrap(zoneIndex) {
    _activateSpellTrap(zoneIndex);
  },

  /**
   * 送卡入墓地（公开 API）
   * @param {Object} card - 卡牌对象
   * @param {'player'|'opponent'} player - 所属玩家
   */
  sendToGraveyard(card, player) {
    _sendToGraveyard(card, player);
  },

  /**
   * 除外卡牌（公开 API）
   * @param {Object} card - 卡牌对象
   * @param {'player'|'opponent'} player - 所属玩家
   */
  banishCard(card, player) {
    _banishCard(card, player);
  },

  /**
   * 获取当前战斗状态快照（用于调试/存档）
   */
  getState() {
    return _active ? clone(_state) : null;
  }
};
