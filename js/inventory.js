/* ==========================================================================
   光之回响 (Echoes of Light) — 背包界面模块
   ========================================================================== */

import { AppState } from './state.js?v=19';
import { Notifications } from './notifications.js?v=19';

/* ==========================================================================
   常量
   ========================================================================== */

/** 分类标签配置 */
var CATEGORIES = [
  { key: 'all',        label: '全部' },
  { key: 'consumable', label: '消耗品' },
  { key: 'material',   label: '素材' },
  { key: 'key',        label: '剧情物品' },
  { key: 'pack',       label: '卡包' }
];

/** 物品类型 → Lucide 图标映射 */
var ITEM_ICONS = {
  'consumable': 'flask-conical',
  'material':   'gem',
  'key':        'key-round',
  'pack':       'package'
};

/** 默认图标 */
var DEFAULT_ITEM_ICON = 'box';

/** 稀有度中文标签 */
var RARITY_LABELS = {
  'common':    '普通',
  'rare':      '稀有',
  'epic':      '史诗',
  'legendary': '传说'
};

/** 稀有度排序权重（用于颜色显示优先级） */
var RARITY_ORDER = {
  'common': 0,
  'rare': 1,
  'epic': 2,
  'legendary': 3
};

/** 消耗品效果执行映射 */
var CONSUMABLE_EFFECTS = {
  '恢复300LP': function () {
    var player = AppState.get('player');
    var newLp = Math.min(player.lp + 300, player.maxLp);
    player.lp = newLp;
    AppState.set('player', player);
    Notifications.show('success', '使用成功', '恢复 300 LP', 2000);
  },
  '恢复100LP': function () {
    var player = AppState.get('player');
    var newLp = Math.min(player.lp + 100, player.maxLp);
    player.lp = newLp;
    AppState.set('player', player);
    Notifications.show('success', '使用成功', '恢复 100 LP', 2000);
  },
  '清除所有异常状态': function () {
    Notifications.show('info', '使用成功', '已清除所有异常状态', 2000);
  }
};

/* ==========================================================================
   内部状态
   ========================================================================== */

var _currentFilter = 'all';
var _selectedItemId = null;
var _discardingItemId = null; // 正在确认丢弃的物品 ID

/* ==========================================================================
   InventoryPanel 单例
   ========================================================================== */

export var InventoryPanel = {

  /* ======================================================================
     init — 初始化背包面板
     ====================================================================== */
  init: function () {
    this.render();

    // 订阅 inventory 变化 → 重新渲染
    AppState.subscribe('inventory', function () {
      // 保留选中状态
      InventoryPanel._renderGrid(InventoryPanel._getFilteredItems());
      InventoryPanel._renderGems();
    });

    // 订阅 player 变化 → 更新灵辉余额
    AppState.subscribe('player', function () {
      InventoryPanel._renderGems();
    });
  },

  /* ======================================================================
     render — 渲染背包面板 HTML
     ====================================================================== */
  render: function () {
    var panel = document.getElementById('panel-inventory');
    if (!panel) return;

    var player = AppState.get('player');
    var spiritGems = player && player.spiritGems != null ? player.spiritGems : 0;

    // 分类标签 HTML
    var tabsHtml = '';
    CATEGORIES.forEach(function (cat) {
      var activeClass = cat.key === 'all' ? ' active' : '';
      tabsHtml +=
        '<button class="category-tab' + activeClass + '" data-category="' + cat.key + '">' +
          cat.label +
        '</button>';
    });

    var filteredItems = this._getFilteredItems();
    var gridHtml = this._buildGridHTML(filteredItems);

    panel.innerHTML =
      '<div class="inventory-header">' +
        '<h2 class="inventory-title">背包</h2>' +
        '<div class="inventory-gems">' +
          '<span class="gems-number" id="gems-display">' + spiritGems + '</span>' +
          '<i data-lucide="gem" class="gems-icon"></i>' +
        '</div>' +
      '</div>' +
      '<div class="inventory-categories" id="inventory-categories">' +
        tabsHtml +
      '</div>' +
      '<div class="inventory-grid-wrapper">' +
        '<div class="inventory-grid" id="inventory-grid">' +
          gridHtml +
        '</div>' +
      '</div>' +
      '<div class="item-detail" id="item-detail"></div>';

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    this._bindEvents();
  },

  /* ======================================================================
     _getFilteredItems — 获取当前分类过滤后的物品列表
     ====================================================================== */
  _getFilteredItems: function () {
    var inventory = AppState.get('inventory') || [];

    if (_currentFilter === 'all') {
      return inventory.slice();
    }

    return inventory.filter(function (item) {
      return item.type === _currentFilter;
    });
  },

  /* ======================================================================
     _buildGridHTML — 构建物品网格 HTML
     ====================================================================== */
  _buildGridHTML: function (items) {
    if (items.length === 0) {
      return '<div class="inventory-grid-empty">该分类下没有物品</div>';
    }

    var html = '';
    var self = this;

    items.forEach(function (item) {
      html += self._buildItemCard(item);
    });

    return html;
  },

  /* ======================================================================
     _buildItemCard — 构建单个物品卡片 HTML
     ====================================================================== */
  _buildItemCard: function (item) {
    var iconName = ITEM_ICONS[item.type] || DEFAULT_ITEM_ICON;
    var rarityClass = 'rarity-' + (RARITY_ORDER[item.rarity] != null ? item.rarity : 'common');
    var selectedClass = _selectedItemId === item.id ? ' selected' : '';
    var count = item.count != null ? item.count : 1;

    return '<div class="item-card ' + rarityClass + selectedClass + '" data-item-id="' + this._escapeHtml(item.id) + '">' +
      '<i data-lucide="' + iconName + '" class="item-icon" style="color: var(--color-rarity-' + item.rarity + ');"></i>' +
      '<span class="item-card-name">' + this._escapeHtml(item.name) + '</span>' +
      (count > 1 ? '<span class="item-count">' + count + '</span>' : '') +
    '</div>';
  },

  /* ======================================================================
     _renderGrid — 重新渲染网格（保留事件）
     ====================================================================== */
  _renderGrid: function (items) {
    var grid = document.getElementById('inventory-grid');
    if (!grid) return;

    grid.innerHTML = this._buildGridHTML(items);

    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }
  },

  /* ======================================================================
     _renderGems — 更新灵辉余额显示
     ====================================================================== */
  _renderGems: function () {
    var gemsDisplay = document.getElementById('gems-display');
    if (!gemsDisplay) return;

    var player = AppState.get('player');
    if (player && player.spiritGems != null) {
      gemsDisplay.textContent = player.spiritGems;
    }
  },

  /* ======================================================================
     _bindEvents — 事件绑定（事件委托）
     ====================================================================== */
  _bindEvents: function () {
    var panel = document.getElementById('panel-inventory');
    if (!panel) return;

    var self = this;

    // ---- 分类标签切换 ----
    panel.addEventListener('click', function (e) {
      var tab = e.target.closest('.category-tab');
      if (tab) {
        var category = tab.dataset.category;
        self._switchCategory(category);
        return;
      }
    });

    // ---- 物品卡片点击 ----
    panel.addEventListener('click', function (e) {
      var card = e.target.closest('.item-card');
      if (card) {
        var itemId = card.dataset.itemId;
        self._selectItem(itemId);
        return;
      }
    });

    // ---- 使用按钮 ----
    panel.addEventListener('click', function (e) {
      var useBtn = e.target.closest('.btn-use');
      if (useBtn) {
        self._useSelectedItem();
        return;
      }
    });

    // ---- 丢弃按钮 ----
    panel.addEventListener('click', function (e) {
      var discardBtn = e.target.closest('.btn-discard');
      if (discardBtn) {
        var itemId = discardBtn.dataset.itemId;
        // 如果已经在确认状态，执行丢弃
        if (_discardingItemId === itemId) {
          self._discardItem(itemId);
        } else {
          // 进入确认状态
          self._confirmDiscard(itemId);
        }
        return;
      }
    });
  },

  /* ======================================================================
     _switchCategory — 切换分类过滤
     ====================================================================== */
  _switchCategory: function (category) {
    if (category === _currentFilter) return;

    _currentFilter = category;
    _selectedItemId = null;
    _discardingItemId = null;

    // 更新标签 active 样式
    var tabs = document.querySelectorAll('.category-tab');
    tabs.forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.category === category);
    });

    // 重新渲染网格
    var filteredItems = this._getFilteredItems();
    this._renderGrid(filteredItems);

    // 清空详情面板
    var detail = document.getElementById('item-detail');
    if (detail) {
      detail.classList.remove('visible');
      detail.innerHTML = '';
    }
  },

  /* ======================================================================
     _selectItem — 选中物品，展示详情
     ====================================================================== */
  _selectItem: function (itemId) {
    var inventory = AppState.get('inventory') || [];
    var item = null;

    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === itemId) {
        item = inventory[i];
        break;
      }
    }

    if (!item) return;

    _selectedItemId = itemId;
    _discardingItemId = null;

    // 更新网格选中状态
    var cards = document.querySelectorAll('.item-card');
    cards.forEach(function (card) {
      card.classList.toggle('selected', card.dataset.itemId === itemId);
    });

    // 渲染详情面板
    this._renderDetail(item);
  },

  /* ======================================================================
     _renderDetail — 渲染物品详情面板
     ====================================================================== */
  _renderDetail: function (item) {
    var detail = document.getElementById('item-detail');
    if (!detail) return;

    var iconName = ITEM_ICONS[item.type] || DEFAULT_ITEM_ICON;
    var rarityLabel = RARITY_LABELS[item.rarity] || item.rarity;
    var rarityColor = 'var(--color-rarity-' + item.rarity + ')';
    var isConsumable = item.type === 'consumable';
    var isPack = item.type === 'pack';

    // 非消耗品/卡包：使用按钮不可用（显示提示）
    var useDisabled = !isConsumable && !isPack;
    var useText = isConsumable ? '使用' : (isPack ? '打开' : '无法使用');

    detail.innerHTML =
      '<div class="item-detail-icon" style="border-color: ' + rarityColor + ';">' +
        '<i data-lucide="' + iconName + '" class="detail-icon-svg" style="color: ' + rarityColor + ';"></i>' +
      '</div>' +
      '<div class="item-detail-info">' +
        '<div class="item-detail-name" style="color: ' + rarityColor + ';">' + this._escapeHtml(item.name) + '</div>' +
        '<div class="item-detail-rarity" style="color: ' + rarityColor + ';">' +
          '<i data-lucide="sparkles" style="width: 14px; height: 14px;"></i>' +
          rarityLabel +
        '</div>' +
        '<div class="item-detail-effect">' + this._escapeHtml(item.effect || '无特殊效果') + '</div>' +
      '</div>' +
      '<div class="item-detail-actions">' +
        '<button class="btn-use" data-item-id="' + this._escapeHtml(item.id) + '"' + (useDisabled ? ' style="opacity:0.4;cursor:not-allowed;"' : '') + '>' + useText + '</button>' +
        '<button class="btn-discard" data-item-id="' + this._escapeHtml(item.id) + '">丢弃</button>' +
      '</div>';

    detail.classList.add('visible');

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons({ app: detail });
    }

    // 清除丢弃确认状态
    _discardingItemId = null;
  },

  /* ======================================================================
     _useSelectedItem — 使用选中物品
     ====================================================================== */
  _useSelectedItem: function () {
    var inventory = AppState.get('inventory') || [];
    var item = null;
    var itemIdx = -1;

    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === _selectedItemId) {
        item = inventory[i];
        itemIdx = i;
        break;
      }
    }

    if (!item) return;

    // 消耗品：执行效果
    if (item.type === 'consumable') {
      var effectFn = CONSUMABLE_EFFECTS[item.effect];
      if (effectFn) {
        effectFn();
      } else {
        Notifications.show('info', '使用成功', '使用了 ' + item.name, 2000);
      }
      this._decrementItem(itemIdx, item);
      return;
    }

    // 卡包：通知
    if (item.type === 'pack') {
      Notifications.show('info', '打开卡包', '获得了随机卡牌！', 2500);
      this._decrementItem(itemIdx, item);
      return;
    }

    // 其他类型：不可使用
    Notifications.show('info', '提示', '此物品无法使用', 2000);
  },

  /* ======================================================================
     _confirmDiscard — 进入丢弃确认状态
     ====================================================================== */
  _confirmDiscard: function (itemId) {
    _discardingItemId = itemId;

    var detail = document.getElementById('item-detail');
    if (!detail) return;

    var discardBtn = detail.querySelector('.btn-discard');
    if (discardBtn) {
      discardBtn.textContent = '确认丢弃？';
      discardBtn.classList.add('confirming');
    }

    // 点击其他地方自动取消确认状态
    var self = this;
    var cancelFn = function (e) {
      if (!e.target.closest('.btn-discard')) {
        _discardingItemId = null;
        var btn = detail.querySelector('.btn-discard');
        if (btn) {
          btn.textContent = '丢弃';
          btn.classList.remove('confirming');
        }
        document.removeEventListener('click', cancelFn);
      }
    };

    // 延迟注册，避免当前点击立即触发取消
    setTimeout(function () {
      document.addEventListener('click', cancelFn);
    }, 10);
  },

  /* ======================================================================
     _discardItem — 丢弃物品
     ====================================================================== */
  _discardItem: function (itemId) {
    var inventory = AppState.get('inventory') || [];
    var itemIdx = -1;
    var item = null;

    for (var i = 0; i < inventory.length; i++) {
      if (inventory[i].id === itemId) {
        item = inventory[i];
        itemIdx = i;
        break;
      }
    }

    if (itemIdx < 0) return;

    Notifications.show('info', '丢弃成功', '已丢弃 ' + (item ? item.name : '物品'), 2000);

    _discardingItemId = null;

    if (item && item.count > 1) {
      // 减少数量
      item.count -= 1;
      inventory[itemIdx] = item;
      AppState.set('inventory', inventory);
      // 保持在相同分类下更新
      var filteredItems = this._getFilteredItems();
      this._renderGrid(filteredItems);
      // 如果还有该物品，保持选中
      if (item.count > 0) {
        this._selectItem(itemId);
      } else {
        _selectedItemId = null;
        var detail = document.getElementById('item-detail');
        if (detail) {
          detail.classList.remove('visible');
          detail.innerHTML = '';
        }
      }
    } else {
      // 移除物品
      inventory.splice(itemIdx, 1);
      AppState.set('inventory', inventory);
      _selectedItemId = null;
      var filteredItems = this._getFilteredItems();
      this._renderGrid(filteredItems);
      var detail = document.getElementById('item-detail');
      if (detail) {
        detail.classList.remove('visible');
        detail.innerHTML = '';
      }
    }
  },

  /* ======================================================================
     _decrementItem — 减少物品数量或移除
     ====================================================================== */
  _decrementItem: function (itemIdx, item) {
    var inventory = AppState.get('inventory') || [];
    var currentItem = inventory[itemIdx];

    if (!currentItem) return;

    if (currentItem.count > 1) {
      currentItem.count -= 1;
      inventory[itemIdx] = currentItem;
      AppState.set('inventory', inventory);
      // 保持在相同分类下更新
      var filteredItems = this._getFilteredItems();
      this._renderGrid(filteredItems);
      // 如果还有该物品，保持选中
      if (currentItem.count > 0) {
        this._selectItem(currentItem.id);
      } else {
        _selectedItemId = null;
        var detail = document.getElementById('item-detail');
        if (detail) {
          detail.classList.remove('visible');
          detail.innerHTML = '';
        }
      }
    } else {
      inventory.splice(itemIdx, 1);
      AppState.set('inventory', inventory);
      _selectedItemId = null;
      var filteredItems = this._getFilteredItems();
      this._renderGrid(filteredItems);
      var detail = document.getElementById('item-detail');
      if (detail) {
        detail.classList.remove('visible');
        detail.innerHTML = '';
      }
    }
  },

  /* ======================================================================
     _escapeHtml — HTML 转义
     ====================================================================== */
  _escapeHtml: function (str) {
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};
