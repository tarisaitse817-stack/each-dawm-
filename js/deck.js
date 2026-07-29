/* ==========================================================================
   光之回响 (Echoes of Light) — 卡组编辑面板模块
   卡组列表、编辑模式（拖拽/点击添加）、卡牌图鉴
   ========================================================================== */

import { AppState } from './state.js';
import { StorageManager } from './storage.js';
import { Notifications } from './notifications.js';

/* ==========================================================================
   工具函数
   ========================================================================== */

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/* ==========================================================================
   常量映射
   ========================================================================== */

var ATTRIBUTE_ICONS = {
  '光': 'sun',
  '暗': 'moon',
  '自然': 'leaf',
  '火焰': 'flame',
  '水流': 'droplets',
  '风暴': 'wind',
  '大地': 'mountain'
};

var RARITY_LABELS = {
  common: '普通',
  rare: '稀有',
  epic: '史诗',
  legendary: '传说'
};

/* ==========================================================================
   卡牌数据生成 — 40+ 张样例卡牌
   怪兽卡 20 张 + 魔法卡 12 张 + 陷阱卡 8 张
   ========================================================================== */

function generateSampleCards() {
  var cards = [];

  // ============================
  // 怪兽卡 (20 张)
  // ============================

  cards.push({
    id: 'card-m001', name: '光之骑士', attribute: '光',
    cardType: 'monster', monsterType: '战士族', level: 4,
    atk: 1800, def: 1200,
    effect: '以此卡攻击的伤害计算时，此卡的攻击力上升300。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-m002', name: '辉光天使', attribute: '光',
    cardType: 'monster', monsterType: '天使族', level: 6,
    atk: 2400, def: 2000,
    effect: '此卡召唤成功时，恢复自己1000LP。',
    rarity: 'epic', obtained: true
  });

  cards.push({
    id: 'card-m003', name: '圣光守卫', attribute: '光',
    cardType: 'monster', monsterType: '战士族', level: 3,
    atk: 1200, def: 2000,
    effect: '此卡不能攻击，1回合1次，可以把战斗伤害变为0。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-m004', name: '耀斑龙', attribute: '光',
    cardType: 'monster', monsterType: '龙族', level: 7,
    atk: 2700, def: 2300,
    effect: '此卡从手卡丢弃时，可以破坏对方场上1张卡。',
    rarity: 'legendary', obtained: true
  });

  cards.push({
    id: 'card-m005', name: '暗影刺客', attribute: '暗',
    cardType: 'monster', monsterType: '恶魔族', level: 4,
    atk: 2000, def: 0,
    effect: '此卡可以直接攻击对方玩家。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-m006', name: '深渊监视者', attribute: '暗',
    cardType: 'monster', monsterType: '恶魔族', level: 5,
    atk: 2200, def: 1800,
    effect: '此卡召唤成功时，可以从卡组将1张暗属性卡加入手卡。',
    rarity: 'epic', obtained: true
  });

  cards.push({
    id: 'card-m007', name: '冥界使者', attribute: '暗',
    cardType: 'monster', monsterType: '魔法师族', level: 2,
    atk: 800, def: 600,
    effect: '此卡被破坏时，从卡组特殊召唤1只等级4以下的暗属性怪兽。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-m008', name: '黑羽魔女', attribute: '暗',
    cardType: 'monster', monsterType: '魔法师族', level: 4,
    atk: 1700, def: 1500,
    effect: '丢弃1张手卡才能发动。以场上1张卡为对象破坏。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-m009', name: '森林精灵', attribute: '自然',
    cardType: 'monster', monsterType: '植物族', level: 3,
    atk: 1400, def: 1000,
    effect: '此卡召唤成功时，从卡组将1张自然属性怪兽加入手卡。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-m010', name: '花开兽', attribute: '自然',
    cardType: 'monster', monsterType: '兽族', level: 5,
    atk: 2300, def: 1800,
    effect: '此卡战斗破坏对方怪兽时，回复那只怪兽攻击力数值的LP。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-m011', name: '古树长老', attribute: '自然',
    cardType: 'monster', monsterType: '植物族', level: 6,
    atk: 2000, def: 2800,
    effect: '1回合1次，可以选择自己墓地1只自然属性怪兽特殊召唤。',
    rarity: 'epic', obtained: true
  });

  cards.push({
    id: 'card-m012', name: '烈焰凤凰', attribute: '火焰',
    cardType: 'monster', monsterType: '鸟兽族', level: 6,
    atk: 2500, def: 1600,
    effect: '此卡被破坏时，可以从手卡或墓地特殊召唤。这个效果1回合只能使用1次。',
    rarity: 'epic', obtained: true
  });

  cards.push({
    id: 'card-m013', name: '熔岩巨人', attribute: '火焰',
    cardType: 'monster', monsterType: '岩石族', level: 7,
    atk: 2600, def: 2400,
    effect: '此卡不能通常召唤。把自己场上2只怪兽解放的场合可以特殊召唤。',
    rarity: 'legendary', obtained: true
  });

  cards.push({
    id: 'card-m014', name: '火花妖精', attribute: '火焰',
    cardType: 'monster', monsterType: '魔法师族', level: 2,
    atk: 600, def: 400,
    effect: '此卡被解放时，给予对方500点伤害。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-m015', name: '冰晶海龙', attribute: '水流',
    cardType: 'monster', monsterType: '水族', level: 5,
    atk: 2100, def: 1900,
    effect: '场上存在的水属性怪兽攻击力上升500。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-m016', name: '潮汐术士', attribute: '水流',
    cardType: 'monster', monsterType: '魔法师族', level: 4,
    atk: 1600, def: 1400,
    effect: '1回合1次，可以把1只水属性怪兽的攻击力直到回合结束时上升800。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-m017', name: '风雷神鹰', attribute: '风暴',
    cardType: 'monster', monsterType: '鸟兽族', level: 6,
    atk: 2400, def: 1700,
    effect: '此卡召唤成功时，可以破坏对方场上最多2张魔法陷阱卡。',
    rarity: 'epic', obtained: false
  });

  cards.push({
    id: 'card-m018', name: '暴风剑豪', attribute: '风暴',
    cardType: 'monster', monsterType: '战士族', level: 4,
    atk: 1900, def: 1300,
    effect: '此卡攻击守备表示怪兽时，若攻击力超过守备力，给予对方差值战斗伤害。',
    rarity: 'rare', obtained: false
  });

  cards.push({
    id: 'card-m019', name: '大地守护者', attribute: '大地',
    cardType: 'monster', monsterType: '岩石族', level: 5,
    atk: 2000, def: 2600,
    effect: '只要此卡在场上表侧表示存在，自己受到的伤害减半。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-m020', name: '岩山巨像', attribute: '大地',
    cardType: 'monster', monsterType: '岩石族', level: 8,
    atk: 2800, def: 3000,
    effect: '此卡不能特殊召唤。此卡攻击的场合，对方直到伤害步骤结束时不能发动魔法陷阱。',
    rarity: 'legendary', obtained: true
  });

  // ============================
  // 魔法卡 (12 张)
  // ============================

  cards.push({
    id: 'card-s001', name: '光之祝福', attribute: '光',
    cardType: 'spell', spellType: '通常魔法',
    effect: '恢复自己1000LP。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-s002', name: '光辉圣剑', attribute: '光',
    cardType: 'spell', spellType: '装备魔法',
    effect: '装备怪兽攻击力上升700。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-s003', name: '暗之契约', attribute: '暗',
    cardType: 'spell', spellType: '通常魔法',
    effect: '从卡组抽2张卡，然后从手卡选1张丢弃。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-s004', name: '暗黑领域', attribute: '暗',
    cardType: 'spell', spellType: '场地魔法',
    effect: '场上所有暗属性怪兽攻击力上升400，守备力上升200。',
    rarity: 'epic', obtained: true
  });

  cards.push({
    id: 'card-s005', name: '自然恩赐', attribute: '自然',
    cardType: 'spell', spellType: '通常魔法',
    effect: '从卡组把1只等级4以下的自然属性怪兽加入手卡。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-s006', name: '生命之森', attribute: '自然',
    cardType: 'spell', spellType: '永续魔法',
    effect: '自己的结束阶段时，自己场上每有1只自然属性怪兽，恢复200LP。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-s007', name: '火焰风暴', attribute: '火焰',
    cardType: 'spell', spellType: '速攻魔法',
    effect: '给予对方800点伤害。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-s008', name: '烈焰之舞', attribute: '火焰',
    cardType: 'spell', spellType: '装备魔法',
    effect: '装备怪兽攻击力上升1000，每次自己准备阶段下降200。',
    rarity: 'epic', obtained: true
  });

  cards.push({
    id: 'card-s009', name: '冰封术', attribute: '水流',
    cardType: 'spell', spellType: '通常魔法',
    effect: '以对方场上1只怪兽为对象，那只怪兽直到下个回合不能攻击。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-s010', name: '暴风之翼', attribute: '风暴',
    cardType: 'spell', spellType: '速攻魔法',
    effect: '自己场上1只怪兽直到回合结束时不受对方魔法效果影响。',
    rarity: 'rare', obtained: false
  });

  cards.push({
    id: 'card-s011', name: '大地之盾', attribute: '大地',
    cardType: 'spell', spellType: '装备魔法',
    effect: '装备怪兽守备力上升1200。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-s012', name: '奇迹融合', attribute: '光',
    cardType: 'spell', spellType: '通常魔法',
    effect: '从场上或墓地选出融合怪兽决定的素材除外，把1只融合怪兽从额外卡组特殊召唤。',
    rarity: 'legendary', obtained: false
  });

  // ============================
  // 陷阱卡 (8 张)
  // ============================

  cards.push({
    id: 'card-t001', name: '神圣屏障', attribute: '光',
    cardType: 'trap', trapType: '通常陷阱',
    effect: '对方攻击宣言时发动。对方攻击怪兽的攻击力直到回合结束时变为0。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-t002', name: '光之反射', attribute: '光',
    cardType: 'trap', trapType: '反击陷阱',
    effect: '以自己场上1只光属性怪兽为对象的魔法陷阱卡的发动无效并破坏。',
    rarity: 'rare', obtained: true
  });

  cards.push({
    id: 'card-t003', name: '暗影陷阱', attribute: '暗',
    cardType: 'trap', trapType: '通常陷阱',
    effect: '对方抽卡阶段时发动。确认对方抽到的卡，那张卡是怪兽卡的场合，给予对方800点伤害。',
    rarity: 'rare', obtained: false
  });

  cards.push({
    id: 'card-t004', name: '自然反噬', attribute: '自然',
    cardType: 'trap', trapType: '通常陷阱',
    effect: '对方怪兽攻击时发动。那只怪兽的攻击力下降自己场上自然属性怪兽数量x300。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-t005', name: '熔岩爆发', attribute: '火焰',
    cardType: 'trap', trapType: '永续陷阱',
    effect: '每次自己的准备阶段，给予对方500点伤害。',
    rarity: 'epic', obtained: true
  });

  cards.push({
    id: 'card-t006', name: '冰晶镜壁', attribute: '水流',
    cardType: 'trap', trapType: '通常陷阱',
    effect: '对方怪兽攻击时发动。那只怪兽的攻击无效，给予对方攻击力数值的伤害。',
    rarity: 'epic', obtained: false
  });

  cards.push({
    id: 'card-t007', name: '旋风屏障', attribute: '风暴',
    cardType: 'trap', trapType: '通常陷阱',
    effect: '对方怪兽攻击时发动。那次攻击无效，结束战斗阶段。',
    rarity: 'common', obtained: true
  });

  cards.push({
    id: 'card-t008', name: '因果切断', attribute: '暗',
    cardType: 'trap', trapType: '反击陷阱',
    effect: '怪兽的召唤反转召唤特殊召唤无效并破坏。',
    rarity: 'legendary', obtained: true
  });

  return cards;
}

/* ==========================================================================
   DeckPanel 单例
   ========================================================================== */

export var DeckPanel = {

  /* ---- 内部状态 ---- */
  _cardLibrary: [],
  _filteredCards: [],
  _currentTab: 'list',
  _editingDeckId: null,
  _currentDeckCards: [],
  _searchQuery: '',
  _attributeFilter: '',

  /* ======================================================================
     init — 初始化卡组面板
     ====================================================================== */
  init: function () {
    // 生成卡牌图鉴数据
    this._cardLibrary = generateSampleCards();
    this._filteredCards = this._cardLibrary.slice();

    // 渲染面板
    this.render();
    this.bindEvents();
  },

  /* ======================================================================
     render — 渲染面板主内容
     ====================================================================== */
  render: function () {
    var panel = document.getElementById('panel-deck');
    if (!panel) return;

    var html =
      '<div class="deck-tabs">' +
        '<button class="deck-tab active" data-tab="list">卡组列表</button>' +
        '<button class="deck-tab" data-tab="edit">编辑模式</button>' +
        '<button class="deck-tab" data-tab="collection">卡牌图鉴</button>' +
      '</div>' +
      '<div class="deck-view active" data-view="list">' +
        this._renderDeckListHTML() +
      '</div>' +
      '<div class="deck-view" data-view="edit">' +
        this._renderEditModeHTML() +
      '</div>' +
      '<div class="deck-view" data-view="collection">' +
        this._renderCollectionHTML() +
      '</div>';

    panel.innerHTML = html;

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ======================================================================
     _renderDeckListHTML — 卡组列表视图 HTML
     ====================================================================== */
  _renderDeckListHTML: function () {
    var decks = AppState.get('decks');

    var html = '<div class="deck-list-grid">';

    decks.forEach(function (deck) {
      var mainCount = deck.mainCards ? deck.mainCards.length : 0;
      var extraCount = deck.extraCards ? deck.extraCards.length : 0;

      // 统计类型分布
      var monsterCount = 0;
      var spellCount = 0;
      var trapCount = 0;
      if (deck.mainCards) {
        deck.mainCards.forEach(function (c) {
          if (c.cardType === 'monster') monsterCount++;
          else if (c.cardType === 'spell') spellCount++;
          else if (c.cardType === 'trap') trapCount++;
        });
      }
      var total = monsterCount + spellCount + trapCount;
      var mPct = total > 0 ? (monsterCount / total * 100) : 0;
      var sPct = total > 0 ? (spellCount / total * 100) : 0;
      var tPct = total > 0 ? (trapCount / total * 100) : 0;

      html +=
        '<div class="deck-card" data-deck-id="' + escapeHtml(deck.id) + '">' +
          '<div class="deck-card-header">' +
            '<span class="deck-card-name">' + escapeHtml(deck.name) + '</span>' +
            '<div class="deck-card-actions">' +
              '<button class="deck-card-btn edit-btn" data-action="edit-deck" data-deck-id="' + escapeHtml(deck.id) + '">编辑</button>' +
              '<button class="deck-card-btn delete-btn" data-action="delete-deck" data-deck-id="' + escapeHtml(deck.id) + '">删除</button>' +
            '</div>' +
          '</div>' +
          '<div class="deck-card-stats">' +
            '<span class="deck-stat">主卡组 <strong>' + mainCount + '</strong></span>' +
            '<span class="deck-stat">额外 <strong>' + extraCount + '</strong></span>' +
            '<span class="deck-stat">怪兽 <strong>' + monsterCount + '</strong></span>' +
            '<span class="deck-stat">魔法 <strong>' + spellCount + '</strong></span>' +
            '<span class="deck-stat">陷阱 <strong>' + trapCount + '</strong></span>' +
          '</div>' +
          (total > 0
            ? '<div class="deck-type-bar">' +
                (monsterCount > 0 ? '<span class="bar-seg monster" style="width:' + mPct + '%"></span>' : '') +
                (spellCount > 0 ? '<span class="bar-seg spell" style="width:' + sPct + '%"></span>' : '') +
                (trapCount > 0 ? '<span class="bar-seg trap" style="width:' + tPct + '%"></span>' : '') +
              '</div>'
            : '') +
        '</div>';
    });

    // 新建卡组卡片
    html +=
      '<div class="deck-card-new" data-action="new-deck">' +
        '<i data-lucide="plus" class="new-deck-icon"></i>' +
        '<span class="new-deck-label">新建卡组</span>' +
      '</div>';

    html += '</div>';
    return html;
  },

  /* ======================================================================
     _renderEditModeHTML — 编辑模式视图 HTML
     ====================================================================== */
  _renderEditModeHTML: function () {
    var self = this;
    var editingDeckName = '新卡组';

    if (this._editingDeckId) {
      var decks = AppState.get('decks');
      var found = null;
      for (var i = 0; i < decks.length; i++) {
        if (decks[i].id === this._editingDeckId) {
          found = decks[i];
          break;
        }
      }
      if (found) {
        editingDeckName = found.name;
      }
    }

    // 获取过滤后的卡牌
    var filtered = this._filteredCards;

    // 生成卡牌库网格
    var gridHtml = '';
    filtered.forEach(function (card) {
      gridHtml += self._buildCardThumbHTML(card, 'library');
    });

    if (filtered.length === 0) {
      gridHtml += '<div class="deck-current-empty">没有找到匹配的卡牌</div>';
    }

    // 生成当前卡组内容
    var deckHtml = '';
    var deckCards = this._currentDeckCards;
    var cardCounts = {};
    deckCards.forEach(function (c) {
      cardCounts[c.id] = (cardCounts[c.id] || 0) + 1;
    });

    // 去重显示卡片，带上计数
    var seen = {};
    deckCards.forEach(function (card) {
      if (!seen[card.id]) {
        seen[card.id] = true;
        deckHtml += self._buildCardThumbHTML(card, 'deck', cardCounts[card.id]);
      }
    });

    if (deckCards.length === 0) {
      deckHtml = '<div class="deck-current-empty">点击上方卡牌添加到此卡组</div>';
    }

    var totalCount = deckCards.length;
    var countClass = totalCount > 60 ? 'deck-current-count warning' : 'deck-current-count';

    var html =
      '<div class="deck-edit-layout">' +
        // 返回 + 保存按钮
        '<div style="display:flex;gap:8px;align-items:center;">' +
          '<button class="deck-back-btn" data-action="back-to-list"><i data-lucide="arrow-left" style="width:14px;height:14px;"></i> 返回</button>' +
          '<span style="flex:1;font-family:var(--font-ui);font-size:1rem;font-weight:600;color:#e0e0e0;">' + escapeHtml(editingDeckName) + '</span>' +
          '<button class="deck-save-btn" data-action="save-deck">保存卡组</button>' +
        '</div>' +

        // 卡牌库区
        '<div class="deck-library">' +
          '<div class="deck-library-header">' +
            '<input type="text" class="deck-search-input" id="deck-search-input" placeholder="搜索卡牌名称…" value="' + escapeHtml(this._searchQuery) + '">' +
            '<select class="deck-filter-select" id="deck-attribute-filter">' +
              '<option value="">全部属性</option>' +
              '<option value="光"' + (this._attributeFilter === '光' ? ' selected' : '') + '>光</option>' +
              '<option value="暗"' + (this._attributeFilter === '暗' ? ' selected' : '') + '>暗</option>' +
              '<option value="自然"' + (this._attributeFilter === '自然' ? ' selected' : '') + '>自然</option>' +
              '<option value="火焰"' + (this._attributeFilter === '火焰' ? ' selected' : '') + '>火焰</option>' +
              '<option value="水流"' + (this._attributeFilter === '水流' ? ' selected' : '') + '>水流</option>' +
              '<option value="风暴"' + (this._attributeFilter === '风暴' ? ' selected' : '') + '>风暴</option>' +
              '<option value="大地"' + (this._attributeFilter === '大地' ? ' selected' : '') + '>大地</option>' +
            '</select>' +
          '</div>' +
          '<div class="deck-library-grid" id="deck-library-grid">' +
            gridHtml +
          '</div>' +
        '</div>' +

        // 当前卡组区
        '<div class="deck-current">' +
          '<div class="deck-current-header">' +
            '<span class="deck-current-title">当前卡组</span>' +
            '<span class="' + countClass + '" id="deck-count-display">' + totalCount + ' / 60</span>' +
          '</div>' +
          '<div class="deck-current-list" id="deck-current-list">' +
            deckHtml +
          '</div>' +
        '</div>' +
      '</div>';

    return html;
  },

  /* ======================================================================
     _renderCollectionHTML — 卡牌图鉴视图 HTML
     ====================================================================== */
  _renderCollectionHTML: function () {
    var self = this;
    var html = '<div class="deck-collection-grid">';

    this._cardLibrary.forEach(function (card) {
      var rarityClass = 'card-rarity-' + card.rarity;
      var unobtainedClass = card.obtained ? '' : ' unobtained';

      html +=
        '<div class="card-collection-item' + unobtainedClass + ' ' + rarityClass + '" data-card-id="' + card.id + '" data-action="show-detail">';

      // 已获得标记
      if (card.obtained) {
        html += '<i data-lucide="check-circle" class="ci-obtained-badge"></i>';
      }

      // 名称
      html += '<div class="ci-name">' + escapeHtml(card.name) + '</div>';

      // 属性 + 类型
      var typeLabel = '';
      if (card.cardType === 'monster') {
        typeLabel = card.attribute + ' / ' + card.monsterType;
      } else if (card.cardType === 'spell') {
        typeLabel = card.attribute + ' / ' + card.spellType;
      } else if (card.cardType === 'trap') {
        typeLabel = card.attribute + ' / ' + card.trapType;
      }
      html += '<div class="ci-attr-type">' + escapeHtml(typeLabel) + '</div>';

      // 怪兽 ATK/DEF
      if (card.cardType === 'monster') {
        html += '<div class="ci-stats">' +
          '<span class="ci-atk">ATK/' + card.atk + '</span>' +
          '<span class="ci-def">DEF/' + card.def + '</span>' +
          '</div>';
      }

      html += '</div>';
    });

    html += '</div>';
    return html;
  },

  /* ======================================================================
     _buildCardThumbHTML — 构建卡牌缩略图 HTML
     context: 'library' | 'deck'
     ====================================================================== */
  _buildCardThumbHTML: function (card, context, count) {
    var rarityClass = 'card-rarity-' + card.rarity;
    var typeClass = card.cardType === 'spell' ? ' card-spell' : (card.cardType === 'trap' ? ' card-trap' : '');
    var draggable = context === 'library' ? ' draggable="true"' : '';
    var html = '';

    html += '<div class="card-thumb ' + rarityClass + typeClass + '"' +
      draggable +
      ' data-card-id="' + card.id + '"' +
      ' data-action="' + (context === 'library' ? 'add-to-deck' : 'remove-from-deck') + '"' +
      ' title="' + escapeHtml(card.name) + '">';

    // Header
    html += '<div class="ct-header">';
    html += '<span class="ct-name">' + escapeHtml(card.name) + '</span>';
    if (card.cardType === 'monster' && card.level) {
      var stars = '';
      for (var i = 0; i < card.level; i++) stars += '★';
      html += '<span class="ct-level">' + stars + '</span>';
    }
    html += '</div>';

    // Body
    html += '<div class="ct-body">';
    html += '<span class="ct-attr-icon">' + (ATTRIBUTE_ICONS[card.attribute] || '') + '</span>';

    var typeLabel = '';
    if (card.cardType === 'monster') {
      typeLabel = card.monsterType;
    } else if (card.cardType === 'spell') {
      typeLabel = card.spellType;
    } else if (card.cardType === 'trap') {
      typeLabel = card.trapType;
    }
    html += '<span class="ct-type-label">' + escapeHtml(typeLabel) + '</span>';
    html += '</div>';

    // Stats (monster only)
    if (card.cardType === 'monster') {
      html += '<div class="ct-stats">' +
        '<span class="ct-atk">ATK/' + card.atk + '</span>' +
        '<span class="ct-def">DEF/' + card.def + '</span>' +
        '</div>';
    }

    // Count badge (deck context only)
    if (context === 'deck' && count && count > 0) {
      html += '<span class="ct-count-badge">' + count + '</span>';
    }

    html += '</div>';

    return html;
  },

  /* ======================================================================
     _showCardDetail — 显示卡牌详情弹出框
     ====================================================================== */
  _showCardDetail: function (card) {
    var self = this;

    // 移除已有的弹出框
    this._hideCardDetail();

    var rarityTagClass = 'cdp-rarity-tag ' + card.rarity;
    var rarityLabel = RARITY_LABELS[card.rarity] || card.rarity;

    var typeLine = '';
    if (card.cardType === 'monster') {
      typeLine = card.attribute + ' 属性 / ' + (card.monsterType || '') + ' / 等级' + (card.level || '') + ' / 怪兽';
    } else if (card.cardType === 'spell') {
      typeLine = card.attribute + ' 属性 / ' + (card.spellType || '') + ' / 魔法卡';
    } else if (card.cardType === 'trap') {
      typeLine = card.attribute + ' 属性 / ' + (card.trapType || '') + ' / 陷阱卡';
    }

    var obtainedText = card.obtained ? '已获得' : '未获得';
    var obtainedClass = card.obtained ? 'obtained' : 'unobtained';

    var statsHtml = '';
    if (card.cardType === 'monster') {
      statsHtml =
        '<div class="cdp-stats-row">' +
          '<span class="cdp-stat"><span class="cdp-stat-label">ATK</span><span class="cdp-atk">' + card.atk + '</span></span>' +
          '<span class="cdp-stat"><span class="cdp-stat-label">DEF</span><span class="cdp-def">' + card.def + '</span></span>' +
        '</div>';
    }

    // 遮罩
    var overlay = document.createElement('div');
    overlay.className = 'popup-overlay';
    overlay.id = 'detail-popup-overlay';
    document.body.appendChild(overlay);

    // 弹出框
    var popup = document.createElement('div');
    popup.className = 'card-detail-popup';
    popup.id = 'card-detail-popup';
    popup.innerHTML =
      '<button class="cdp-close" id="detail-popup-close"><i data-lucide="x" style="width:18px;height:18px;"></i></button>' +
      '<div class="cdp-header">' +
        '<div class="cdp-name" style="color:var(--color-rarity-' + card.rarity + ');">' + escapeHtml(card.name) + '</div>' +
        '<div class="cdp-attr-row">' + escapeHtml(typeLine) + '</div>' +
      '</div>' +
      (card.cardType === 'monster' ? statsHtml : '') +
      '<div class="cdp-divider"></div>' +
      '<div class="cdp-effect-label">效果</div>' +
      '<div class="cdp-effect-text">' + escapeHtml(card.effect || '无效果') + '</div>' +
      '<div class="cdp-divider"></div>' +
      '<span class="' + rarityTagClass + '">' + rarityLabel + '</span>' +
      '<div class="cdp-obtained-status ' + obtainedClass + '">' + obtainedText + '</div>';

    document.body.appendChild(popup);

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons({ app: popup });
    }

    // 关闭事件
    overlay.addEventListener('click', function () {
      self._hideCardDetail();
    });

    var closeBtn = document.getElementById('detail-popup-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function () {
        self._hideCardDetail();
      });
    }
  },

  /* ======================================================================
     _hideCardDetail — 隐藏卡牌详情弹出框
     ====================================================================== */
  _hideCardDetail: function () {
    var popup = document.getElementById('card-detail-popup');
    if (popup) {
      popup.remove();
    }
    var overlay = document.getElementById('detail-popup-overlay');
    if (overlay) {
      overlay.remove();
    }
  },

  /* ======================================================================
     bindEvents — 事件绑定
     ====================================================================== */
  bindEvents: function () {
    var self = this;
    var panel = document.getElementById('panel-deck');
    if (!panel) return;

    // ---- 标签切换 ----
    panel.addEventListener('click', function (e) {
      var tab = e.target.closest('.deck-tab');
      if (tab) {
        var tabId = tab.dataset.tab;
        self._switchTab(tabId);
        return;
      }
    });

    // ---- 事件委托处理各类按钮点击 ----
    panel.addEventListener('click', function (e) {
      var actionEl = e.target.closest('[data-action]');
      if (!actionEl) return;
      var action = actionEl.dataset.action;

      switch (action) {
        case 'edit-deck':
          self._startEditDeck(actionEl.dataset.deckId);
          break;
        case 'delete-deck':
          self._deleteDeck(actionEl.dataset.deckId);
          break;
        case 'new-deck':
          self._createNewDeck();
          break;
        case 'back-to-list':
          self._switchTab('list');
          break;
        case 'save-deck':
          self._saveDeck();
          break;
        case 'add-to-deck':
          self._addCardToDeck(actionEl.dataset.cardId);
          break;
        case 'remove-from-deck':
          self._removeCardFromDeck(actionEl.dataset.cardId);
          break;
        case 'show-detail':
          self._showCardDetailByCardId(actionEl.dataset.cardId);
          break;
      }
    });

    // ---- 搜索输入（事件委托 — 元素会在重渲染时被替换） ----
    panel.addEventListener('input', function (e) {
      if (e.target.id === 'deck-search-input') {
        self._searchQuery = e.target.value;
        self._applyFilterAndRenderEdit();
      }
    });

    // ---- 属性筛选下拉（事件委托） ----
    panel.addEventListener('change', function (e) {
      if (e.target.id === 'deck-attribute-filter') {
        self._attributeFilter = e.target.value;
        self._applyFilterAndRenderEdit();
      }
    });

    // ---- 拖拽事件：卡牌库 dragstart ----
    panel.addEventListener('dragstart', function (e) {
      var thumb = e.target.closest('.card-thumb');
      if (!thumb || thumb.closest('.deck-current-list')) return; // only from library

      var cardId = thumb.dataset.cardId;
      if (cardId) {
        e.dataTransfer.setData('text/plain', cardId);
        e.dataTransfer.effectAllowed = 'copy';
        thumb.classList.add('dragging');
      }
    });

    panel.addEventListener('dragend', function (e) {
      var thumb = e.target.closest('.card-thumb');
      if (thumb) {
        thumb.classList.remove('dragging');
      }
    });

    // ---- 拖拽事件：当前卡组区域 dragover/drop ----
    panel.addEventListener('dragover', function (e) {
      var deckList = e.target.closest('#deck-current-list');
      if (deckList) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      }
    });

    panel.addEventListener('drop', function (e) {
      var deckList = e.target.closest('#deck-current-list');
      if (!deckList) return;

      e.preventDefault();
      var cardId = e.dataTransfer.getData('text/plain');
      if (cardId) {
        self._addCardToDeck(cardId);
      }
    });

    // ---- 右键弹出详情 ----
    panel.addEventListener('contextmenu', function (e) {
      var thumb = e.target.closest('.card-thumb');
      var collItem = e.target.closest('.card-collection-item');
      if (thumb) {
        e.preventDefault();
        self._showCardDetailByCardId(thumb.dataset.cardId);
      } else if (collItem) {
        e.preventDefault();
        self._showCardDetailByCardId(collItem.dataset.cardId);
      }
    });
  },

  /* ======================================================================
     _switchTab — 切换子标签
     ====================================================================== */
  _switchTab: function (tabId) {
    if (tabId === this._currentTab) return;

    var panel = document.getElementById('panel-deck');
    if (!panel) return;

    // 更新标签 active
    var tabs = panel.querySelectorAll('.deck-tab');
    tabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });

    // 更新视图
    var views = panel.querySelectorAll('.deck-view');
    views.forEach(function (view) {
      view.classList.toggle('active', view.dataset.view === tabId);
    });

    this._currentTab = tabId;

    // 切换到编辑模式时确保重新渲染
    if (tabId === 'edit') {
      this._reRenderEditView();
    }

    // 切换到图鉴时确保图标重新渲染
    if (tabId === 'collection') {
      if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
      }
    }
  },

  /* ======================================================================
     _startEditDeck — 开始编辑指定卡组
     ====================================================================== */
  _startEditDeck: function (deckId) {
    var decks = AppState.get('decks');
    var deck = null;
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) {
        deck = decks[i];
        break;
      }
    }
    if (!deck) return;

    this._editingDeckId = deckId;
    this._currentDeckCards = deck.mainCards ? deepClone(deck.mainCards) : [];

    // 切换到编辑模式
    this._switchTab('edit');
  },

  /* ======================================================================
     _createNewDeck — 新建卡组
     ====================================================================== */
  _createNewDeck: function () {
    var decks = AppState.get('decks');
    var newId = 'deck-' + Date.now();
    var newName = '新卡组 ' + (decks.length + 1);

    var newDeck = {
      id: newId,
      name: newName,
      mainCards: [],
      extraCards: [],
      sideCards: []
    };

    decks.push(newDeck);
    AppState.set('decks', decks);

    var fullState = AppState.get();
    StorageManager.save(fullState);

    this._editingDeckId = newId;
    this._currentDeckCards = [];

    this._switchTab('edit');

    Notifications.show('info', '新建卡组', '已创建卡组「' + newName + '」', 2000);
  },

  /* ======================================================================
     _deleteDeck — 删除卡组
     ====================================================================== */
  _deleteDeck: function (deckId) {
    var state = AppState.get();
    var decks = state.decks;
    var idx = -1;
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === deckId) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;

    var deckName = decks[idx].name;
    decks.splice(idx, 1);
    AppState.set('decks', decks);

    var fullState = AppState.get();
    StorageManager.save(fullState);

    // 重新渲染列表
    this._reRenderListView();

    Notifications.show('success', '删除成功', '已删除卡组「' + deckName + '」', 1500);
  },

  /* ======================================================================
     _addCardToDeck — 从卡牌库添加卡牌到当前卡组
     ====================================================================== */
  _addCardToDeck: function (cardId) {
    // 从卡牌库查找
    var card = null;
    for (var i = 0; i < this._cardLibrary.length; i++) {
      if (this._cardLibrary[i].id === cardId) {
        card = this._cardLibrary[i];
        break;
      }
    }
    if (!card) return;

    // 检查上限 60
    if (this._currentDeckCards.length >= 60) {
      Notifications.show('warning', '卡组已满', '主卡组最多60张卡', 2000);
      return;
    }

    this._currentDeckCards.push(deepClone(card));
    this._reRenderDeckSection();
  },

  /* ======================================================================
     _removeCardFromDeck — 从当前卡组移除卡牌
     ====================================================================== */
  _removeCardFromDeck: function (cardId) {
    // 移除最后一张匹配的卡
    var idx = -1;
    for (var i = this._currentDeckCards.length - 1; i >= 0; i--) {
      if (this._currentDeckCards[i].id === cardId) {
        idx = i;
        break;
      }
    }
    if (idx < 0) return;

    this._currentDeckCards.splice(idx, 1);
    this._reRenderDeckSection();
  },

  /* ======================================================================
     _saveDeck — 保存当前卡组
     ====================================================================== */
  _saveDeck: function () {
    if (!this._editingDeckId) {
      Notifications.show('warning', '保存失败', '没有正在编辑的卡组', 2000);
      return;
    }

    var state = AppState.get();
    var decks = state.decks;
    var idx = -1;
    for (var i = 0; i < decks.length; i++) {
      if (decks[i].id === this._editingDeckId) {
        idx = i;
        break;
      }
    }

    if (idx >= 0) {
      decks[idx].mainCards = deepClone(this._currentDeckCards);
      AppState.set('decks', decks);

      var fullState = AppState.get();
      StorageManager.save(fullState);

      Notifications.show('success', '保存成功', '卡组「' + decks[idx].name + '」已保存', 1500);
    } else {
      Notifications.show('error', '保存失败', '未找到卡组', 3000);
    }
  },

  /* ======================================================================
     _showCardDetailByCardId — 根据 ID 显示卡牌详情
     ====================================================================== */
  _showCardDetailByCardId: function (cardId) {
    for (var i = 0; i < this._cardLibrary.length; i++) {
      if (this._cardLibrary[i].id === cardId) {
        this._showCardDetail(this._cardLibrary[i]);
        return;
      }
    }
  },

  /* ======================================================================
     _applyFilterAndRenderEdit — 搜索 + 属性筛选并重新渲染编辑视图
     ====================================================================== */
  _applyFilterAndRenderEdit: function () {
    var query = this._searchQuery.trim().toLowerCase();
    var attr = this._attributeFilter;

    this._filteredCards = this._cardLibrary.filter(function (card) {
      // 属性筛选
      if (attr && card.attribute !== attr) return false;
      // 名称搜索
      if (query && card.name.toLowerCase().indexOf(query) < 0) return false;
      return true;
    });

    this._reRenderEditView();
  },

  /* ======================================================================
     _reRenderEditView — 重新渲染编辑视图
     ====================================================================== */
  _reRenderEditView: function () {
    var panel = document.getElementById('panel-deck');
    if (!panel) return;

    var editView = panel.querySelector('[data-view="edit"]');
    if (!editView) return;

    editView.innerHTML = this._renderEditModeHTML();

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ======================================================================
     _reRenderDeckSection — 仅重新渲染编辑模式中卡组区域部分
     ====================================================================== */
  _reRenderDeckSection: function () {
    var self = this;

    // 重新构建当前卡组部分
    var deckCards = this._currentDeckCards;
    var cardCounts = {};
    deckCards.forEach(function (c) {
      cardCounts[c.id] = (cardCounts[c.id] || 0) + 1;
    });

    var deckHtml = '';
    var seen = {};
    deckCards.forEach(function (card) {
      if (!seen[card.id]) {
        seen[card.id] = true;
        deckHtml += self._buildCardThumbHTML(card, 'deck', cardCounts[card.id]);
      }
    });

    if (deckCards.length === 0) {
      deckHtml = '<div class="deck-current-empty">点击上方卡牌添加到此卡组</div>';
    }

    // 更新 DOM
    var deckList = document.getElementById('deck-current-list');
    if (deckList) {
      deckList.innerHTML = deckHtml;
    }

    var countDisplay = document.getElementById('deck-count-display');
    if (countDisplay) {
      var totalCount = deckCards.length;
      countDisplay.textContent = totalCount + ' / 60';
      if (totalCount > 60) {
        countDisplay.className = 'deck-current-count warning';
      } else {
        countDisplay.className = 'deck-current-count';
      }
    }
  },

  /* ======================================================================
     _reRenderListView — 重新渲染卡组列表视图
     ====================================================================== */
  _reRenderListView: function () {
    var panel = document.getElementById('panel-deck');
    if (!panel) return;

    var listView = panel.querySelector('[data-view="list"]');
    if (!listView) return;

    listView.innerHTML = this._renderDeckListHTML();

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  }
};
