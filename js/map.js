/* ==========================================================================
   光之回响 (Echoes of Light) — 地图界面模块
   ========================================================================== */

import { AppState } from './state.js';
import { Notifications } from './notifications.js';

/* ==========================================================================
   常量 — 12 个预设地图节点
   ========================================================================== */

/**
 * 地图节点数据
 * 每个节点：id, name, type, x(%), y(%), status, connections[], desc
 * 类型：temple, nature, town, city, wasteland, dungeon
 * 状态：available, completed, locked
 */
var MAP_NODES = [
  {
    id: 'node-01',
    name: '翡翠神殿',
    type: 'temple',
    x: 15,
    y: 40,
    status: 'available',
    connections: ['node-02', 'node-03'],
    desc: '光之种曾在此沉睡千年的古老神殿，精灵守护者世代镇守。'
  },
  {
    id: 'node-02',
    name: '精灵之泉',
    type: 'nature',
    x: 28,
    y: 25,
    status: 'available',
    connections: ['node-01', 'node-04'],
    desc: '林间深处涌动着灵辉之力的泉水，据说能治愈一切伤痛。'
  },
  {
    id: 'node-03',
    name: '森林小径',
    type: 'nature',
    x: 18,
    y: 60,
    status: 'completed',
    connections: ['node-01'],
    desc: '蜿蜒穿过古老森林的石板小径，路边的苔藓散发着微光。'
  },
  {
    id: 'node-04',
    name: '幽暗密林',
    type: 'nature',
    x: 35,
    y: 50,
    status: 'available',
    connections: ['node-03', 'node-05'],
    desc: '终年不见天日的密林深处，暗影与光芒在此交替。'
  },
  {
    id: 'node-05',
    name: '风语村',
    type: 'town',
    x: 52,
    y: 30,
    status: 'available',
    connections: ['node-04', 'node-10'],
    desc: '坐落于风语草原边缘的宁静村庄，村民以与风对话为乐。'
  },
  {
    id: 'node-06',
    name: '古石城',
    type: 'city',
    x: 48,
    y: 55,
    status: 'locked',
    connections: ['node-04'],
    desc: '由远古巨石垒砌而成的城市废墟，隐藏着失落文明的秘密。'
  },
  {
    id: 'node-07',
    name: '灰烬峡谷',
    type: 'wasteland',
    x: 65,
    y: 45,
    status: 'locked',
    connections: ['node-05', 'node-06'],
    desc: '被烈火焚尽的荒芜峡谷，空气中弥漫着焦灼与绝望的气息。'
  },
  {
    id: 'node-08',
    name: '星光湖泊',
    type: 'nature',
    x: 78,
    y: 20,
    status: 'available',
    connections: ['node-10'],
    desc: '湖水清澈如镜，夜晚倒映漫天星辰，仿佛置身银河。'
  },
  {
    id: 'node-09',
    name: '暗影堡垒',
    type: 'dungeon',
    x: 72,
    y: 65,
    status: 'locked',
    connections: ['node-07', 'node-06'],
    desc: '暗影势力盘踞的黑暗要塞，危险与机遇并存之地。'
  },
  {
    id: 'node-10',
    name: '风语草原',
    type: 'nature',
    x: 60,
    y: 22,
    status: 'completed',
    connections: ['node-05'],
    desc: '一望无际的辽阔草原，风在这里吟唱着古老的歌谣。'
  },
  {
    id: 'node-11',
    name: '月辉塔',
    type: 'city',
    x: 40,
    y: 72,
    status: 'locked',
    connections: ['node-06'],
    desc: '高耸入云的银白高塔，月光照耀时塔身会泛起神秘符文。'
  },
  {
    id: 'node-12',
    name: '世界树遗迹',
    type: 'temple',
    x: 85,
    y: 40,
    status: 'locked',
    connections: ['node-08', 'node-09'],
    desc: '传说中连接天地的世界树残骸，每一片落叶都承载着远古记忆。'
  }
];

/** 节点类型 → Lucide 图标映射 */
var NODE_ICONS = {
  temple: 'building-2',
  nature: 'tree-pine',
  town: 'house',
  city: 'landmark',
  wasteland: 'triangle',
  dungeon: 'sword'
};

/** 节点类型中文标签 */
var TYPE_LABELS = {
  temple: '神殿',
  nature: '自然',
  town: '村落',
  city: '古城',
  wasteland: '荒地',
  dungeon: '堡垒'
};

/** 状态中文标签 */
var STATUS_LABELS = {
  available: '可前往',
  completed: '已探索',
  locked: '未解锁'
};

/* ==========================================================================
   内部状态
   ========================================================================== */

var _nodes = [];                // 当前节点数组（深拷贝）
var _currentNodeId = null;      // 当前所在节点 ID
var _dragState = null;          // 拖拽状态 { startX, startY, offsetX, offsetY }
var _scale = 1.0;               // 当前缩放值
var _viewportOffset = { x: 0, y: 0 }; // 当前视口偏移（像素）
var _hoveredNodeId = null;      // 悬停节点的 ID
var _confirmNodeId = null;      // 正在确认的节点 ID
var _mouseX = 0;                // 鼠标相对画布 X
var _mouseY = 0;                // 鼠标相对画布 Y

/* ==========================================================================
   MapPanel 单例
   ========================================================================== */

export var MapPanel = {

  /* ======================================================================
     init — 初始化地图面板
     ====================================================================== */
  init: function () {
    // 1. 深拷贝节点数据
    _nodes = JSON.parse(JSON.stringify(MAP_NODES));

    // 2. 同步到 AppState
    AppState.set('mapNodes', _nodes);

    // 3. 渲染 DOM
    this.render();

    // 4. 订阅玩家位置变化 → 更新状态栏
    AppState.subscribe('narrativeHistory', function () {
      MapPanel._updateStatusBar();
    });

    // 5. 订阅 mapNodes 变化 → 重绘节点状态
    AppState.subscribe('mapNodes', function (newNodes) {
      if (newNodes && newNodes.length) {
        _nodes = JSON.parse(JSON.stringify(newNodes));
        MapPanel._updateNodes();
        MapPanel._updatePaths();
        MapPanel._updateStatusBar();
      }
    });
  },

  /* ======================================================================
     render — 渲染地图面板 HTML
     ====================================================================== */
  render: function () {
    var panel = document.getElementById('panel-map');
    if (!panel) return;

    // 确定当前节点
    this._determineCurrentNode();

    var statusHtml = this._buildStatusBarHTML();

    panel.innerHTML =
      '<div class="map-canvas" id="map-canvas">' +
        /* 地形纹理背景 */
        '<div class="map-terrain-texture"></div>' +
        /* 地形色彩层 */
        '<div class="map-terrain-layer" id="map-terrain-layer">' +
          this._buildTerrainBlobs() +
        '</div>' +
        /* 地图内容（节点 + 路径 + tooltip + confirm） */
        '<div class="map-content" id="map-content">' +
          /* 路径线容器 */
          '<div class="map-paths-container" id="map-paths">' +
            this._buildPaths() +
          '</div>' +
          /* 节点容器 */
          '<div class="map-nodes-container" id="map-nodes">' +
            this._buildNodes() +
          '</div>' +
          /* Tooltip */
          '<div class="node-tooltip" id="node-tooltip">' +
            '<div class="node-tooltip-title" id="tooltip-title"></div>' +
            '<div class="node-tooltip-desc" id="tooltip-desc"></div>' +
            '<div class="node-tooltip-status" id="tooltip-status"></div>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="map-status" id="map-status">' +
        statusHtml +
      '</div>';

    // 渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons();
    }

    // 绑定事件
    this._bindEvents();

    // 重置视口
    _viewportOffset = { x: 0, y: 0 };
    _scale = 1.0;
    this._applyTransform();
  },

  /* ======================================================================
     _buildTerrainBlobs — 构建手绘风格地形图层
     ====================================================================== */
  _buildTerrainBlobs: function () {
    var blobs = [
      // 森林区域 (覆盖神殿、密林区域)
      '<div class="map-terrain-forest" style="width:42%;height:40%;top:32%;left:10%;"></div>',
      // 湖泊 (星光湖泊周围)
      '<div class="map-terrain-lake" style="width:18%;height:20%;top:14%;left:72%;"></div>',
      // 山脉 (灰烬峡谷区域)
      '<div class="map-terrain-mountain" style="width:22%;height:28%;top:38%;left:56%;"></div>',
      // 城镇区域 (风语村周围)
      '<div class="map-terrain-town" style="width:16%;height:14%;top:24%;left:44%;"></div>',
      // 古城区域 (古石城 + 月辉塔)
      '<div class="map-terrain-town" style="width:12%;height:26%;top:50%;left:36%;opacity:0.5;"></div>',
      // 荒地 (世界树遗迹周围)
      '<div class="map-terrain-waste" style="width:20%;height:22%;top:34%;left:78%;"></div>'
    ];

    return blobs.join('\n');
  },

  /* ======================================================================
     _buildPaths — 构建所有路径线
     ====================================================================== */
  _buildPaths: function () {
    var html = '';
    var drawn = {}; // 防止重复绘制（A→B 和 B→A）

    for (var i = 0; i < _nodes.length; i++) {
      var node = _nodes[i];
      for (var j = 0; j < node.connections.length; j++) {
        var targetId = node.connections[j];
        var target = this._findNode(targetId);
        if (!target) continue;

        // 建立唯一键
        var keyA = node.id < targetId ? node.id + '-' + targetId : targetId + '-' + node.id;
        if (drawn[keyA]) continue;
        drawn[keyA] = true;

        // 计算路径状态：取两端节点中较低的状态
        var status = this._getPathStatus(node.status, target.status);

        html += this._buildPathLine(node, target, status);
      }
    }

    return html;
  },

  /* ======================================================================
     _buildPathLine — 构建单条路径线 HTML
     ====================================================================== */
  _buildPathLine: function (nodeA, nodeB, status) {
    var dx = nodeB.x - nodeA.x;
    var dy = nodeB.y - nodeA.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var angle = Math.atan2(dy, dx) * (180 / Math.PI);

    return '<div class="map-path ' + status + '" ' +
      'style="left:' + nodeA.x + '%;top:' + nodeA.y + '%;' +
      'width:' + dist + '%;' +
      'transform:rotate(' + angle + 'deg);" ' +
      'data-from="' + nodeA.id + '" data-to="' + nodeB.id + '"></div>';
  },

  /* ======================================================================
     _buildNodes — 构建所有节点 HTML
     ====================================================================== */
  _buildNodes: function () {
    var html = '';
    var self = this;

    _nodes.forEach(function (node) {
      var iconName = NODE_ICONS[node.type] || 'circle';
      var isCompleted = node.status === 'completed';

      html += '<div class="map-node ' + node.status + '" ' +
        'id="node-' + node.id + '" ' +
        'data-id="' + node.id + '" ' +
        'data-name="' + self._escapeHtml(node.name) + '" ' +
        'data-type="' + node.type + '" ' +
        'data-status="' + node.status + '" ' +
        'style="left:' + node.x + '%;top:' + node.y + '%;">' +
        '<i data-lucide="' + iconName + '"></i>' +
        (isCompleted ? '<span class="map-node-dot"></span>' : '') +
        '<span class="map-node-label">' + self._escapeHtml(node.name) + '</span>' +
        '</div>';
    });

    return html;
  },

  /* ======================================================================
     _buildStatusBarHTML — 构建状态栏 HTML
     ====================================================================== */
  _buildStatusBarHTML: function () {
    var currentNode = this._findNode(_currentNodeId);
    var currentName = currentNode ? currentNode.name : '未知区域';
    var reachableCount = this._countReachable();
    var completedCount = this._countCompleted();
    var totalCount = _nodes.length;
    var progressPct = Math.round((completedCount / totalCount) * 100);

    return '' +
      '<div class="map-status-item">' +
        '<i data-lucide="map-pin"></i>' +
        '<span>当前区域：</span>' +
        '<span class="status-value">' + this._escapeHtml(currentName) + '</span>' +
      '</div>' +
      '<div class="map-status-item">' +
        '<i data-lucide="navigation"></i>' +
        '<span>可前往：</span>' +
        '<span class="status-value">' + reachableCount + '</span>' +
      '</div>' +
      '<div class="map-status-item">' +
        '<i data-lucide="compass"></i>' +
        '<span>探索进度：</span>' +
        '<span class="status-value">' + completedCount + '/' + totalCount + '</span>' +
        '<div class="map-progress-bar">' +
          '<div class="map-progress-fill" style="width:' + progressPct + '%;"></div>' +
        '</div>' +
      '</div>';
  },

  /* ======================================================================
     _bindEvents — 事件绑定
     ====================================================================== */
  _bindEvents: function () {
    var canvas = document.getElementById('map-canvas');
    if (!canvas) return;

    var self = this;

    /* ---- 拖拽平移 ---- */
    canvas.addEventListener('mousedown', function (e) {
      // 不拦截 tooltip 或 confirm 上的事件
      if (e.target.closest('.node-tooltip') || e.target.closest('.node-confirm')) return;

      _dragState = {
        startX: e.clientX,
        startY: e.clientY,
        offsetX: _viewportOffset.x,
        offsetY: _viewportOffset.y
      };
      canvas.classList.add('grabbing');
    });

    document.addEventListener('mousemove', function (e) {
      // 更新鼠标位置（用于视差）
      var rect = canvas.getBoundingClientRect();
      _mouseX = e.clientX - rect.left;
      _mouseY = e.clientY - rect.top;

      // 视差效果 — 通过 CSS 自定义属性驱动（配合 map.css 中 calc(var(--mx) * -0.02)）
      var terrainLayer = document.getElementById('map-terrain-layer');
      if (terrainLayer) {
        terrainLayer.style.setProperty('--mx', (_mouseX - rect.width / 2) + 'px');
        terrainLayer.style.setProperty('--my', (_mouseY - rect.height / 2) + 'px');
      }

      // 拖拽处理
      if (_dragState) {
        var dx = e.clientX - _dragState.startX;
        var dy = e.clientY - _dragState.startY;
        _viewportOffset.x = _dragState.offsetX + dx;
        _viewportOffset.y = _dragState.offsetY + dy;
        self._applyTransform();
      }
    });

    document.addEventListener('mouseup', function () {
      if (_dragState) {
        _dragState = null;
        var canvasEl = document.getElementById('map-canvas');
        if (canvasEl) canvasEl.classList.remove('grabbing');
      }
    });

    /* ---- 滚轮缩放 ---- */
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      var delta = e.deltaY > 0 ? -0.08 : 0.08;
      _scale = Math.max(0.5, Math.min(2.0, _scale + delta));
      self._applyTransform();
    }, { passive: false });

    /* ---- 节点悬停（tooltip）---- */
    var nodesContainer = document.getElementById('map-nodes');
    if (nodesContainer) {
      nodesContainer.addEventListener('mouseover', function (e) {
        var nodeEl = e.target.closest('.map-node');
        if (nodeEl) {
          self._showTooltip(nodeEl, e);
        }
      });

      nodesContainer.addEventListener('mouseout', function (e) {
        var nodeEl = e.target.closest('.map-node');
        if (nodeEl) {
          self._hideTooltip();
        }
      });

      nodesContainer.addEventListener('mousemove', function (e) {
        var nodeEl = e.target.closest('.map-node');
        if (nodeEl && _hoveredNodeId) {
          self._positionTooltip(e);
        }
      });

      /* ---- 节点点击（前往确认）---- */
      nodesContainer.addEventListener('click', function (e) {
        var nodeEl = e.target.closest('.map-node');
        if (!nodeEl) return;

        var nodeId = nodeEl.dataset.id;
        var node = self._findNode(nodeId);
        if (!node) return;

        // 点击已完成的节点无需操作
        if (node.status === 'completed') {
          return;
        }

        // 点击锁定节点：提示
        if (node.status === 'locked') {
          Notifications.show('info', '路径未解锁', '前方道路尚未开启，继续探索以解锁此区域。', 3000);
          return;
        }

        // 点击可前往节点：显示确认
        if (node.status === 'available') {
          // 如果已有确认弹窗且点击的是同一个节点，不做重复显示
          if (_confirmNodeId === nodeId) return;
          self._showConfirm(node, e);
        }
      });
    }
  },

  /* ======================================================================
     _applyTransform — 应用视口变换（平移 + 缩放）
     ====================================================================== */
  _applyTransform: function () {
    var content = document.getElementById('map-content');
    if (!content) return;

    // 限制平移范围，防止拖出界面
    var canvas = document.getElementById('map-canvas');
    if (canvas) {
      var rect = canvas.getBoundingClientRect();
      var panRange = 0.25 + (_scale - 1) * 0.35;
      var maxOffsetX = rect.width * Math.max(0.15, panRange);
      var maxOffsetY = rect.height * Math.max(0.15, panRange);
      _viewportOffset.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, _viewportOffset.x));
      _viewportOffset.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, _viewportOffset.y));
    }

    content.style.transform =
      'translate(' + _viewportOffset.x + 'px, ' + _viewportOffset.y + 'px) ' +
      'scale(' + _scale + ')';
  },

  /* ======================================================================
     _showTooltip — 显示节点悬停 Tooltip
     ====================================================================== */
  _showTooltip: function (nodeEl, event) {
    var tooltip = document.getElementById('node-tooltip');
    if (!tooltip) return;

    var nodeId = nodeEl.dataset.id;
    var node = this._findNode(nodeId);
    if (!node) return;

    _hoveredNodeId = nodeId;

    var titleEl = document.getElementById('tooltip-title');
    var descEl = document.getElementById('tooltip-desc');
    var statusEl = document.getElementById('tooltip-status');

    if (titleEl) titleEl.textContent = node.name;
    if (descEl) descEl.textContent = node.desc || '';
    if (statusEl) {
      statusEl.textContent = STATUS_LABELS[node.status] || node.status;
      statusEl.className = 'node-tooltip-status ' + node.status;
    }

    this._positionTooltip(event);

    tooltip.classList.add('visible');
  },

  /* ======================================================================
     _positionTooltip — 定位 Tooltip 到鼠标附近
     ====================================================================== */
  _positionTooltip: function (event) {
    var tooltip = document.getElementById('node-tooltip');
    if (!tooltip) return;

    var canvas = document.getElementById('map-canvas');
    if (!canvas) return;

    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left + 15;
    var y = event.clientY - rect.top - 10;

    // 防止 tooltip 超出画布边界
    var tw = tooltip.offsetWidth || 160;
    var th = tooltip.offsetHeight || 80;
    if (x + tw > rect.width - 10) x = event.clientX - rect.left - tw - 15;
    if (y + th > rect.height - 10) y = rect.height - th - 10;
    if (y < 10) y = 10;

    tooltip.style.left = x + 'px';
    tooltip.style.top = y + 'px';
  },

  /* ======================================================================
     _hideTooltip — 隐藏 Tooltip
     ====================================================================== */
  _hideTooltip: function () {
    var tooltip = document.getElementById('node-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
    _hoveredNodeId = null;
  },

  /* ======================================================================
     _showConfirm — 显示前往确认弹窗
     ====================================================================== */
  _showConfirm: function (node, event) {
    // 移除已有确认
    this._removeConfirm();

    _confirmNodeId = node.id;

    var canvas = document.getElementById('map-canvas');
    if (!canvas) return;

    var rect = canvas.getBoundingClientRect();
    var nodeEl = document.getElementById('node-' + node.id);
    if (!nodeEl) return;

    var nodeRect = nodeEl.getBoundingClientRect();
    var cx = nodeRect.left - rect.left + nodeRect.width / 2;
    var cy = nodeRect.bottom - rect.top + 8;

    // 创建确认弹窗
    var confirmEl = document.createElement('div');
    confirmEl.className = 'node-confirm';
    confirmEl.id = 'node-confirm';
    confirmEl.innerHTML =
      '<div class="node-confirm-title">是否前往 <strong>' + this._escapeHtml(node.name) + '</strong>？</div>' +
      '<div class="node-confirm-actions">' +
        '<button class="btn-primary" id="confirm-yes">确认前往</button>' +
        '<button class="btn-secondary" id="confirm-no">取消</button>' +
      '</div>';

    // 定位在节点下方
    confirmEl.style.left = Math.max(10, Math.min(rect.width - 210, cx - 100)) + 'px';
    confirmEl.style.top = Math.min(cy + 4, rect.height - 80) + 'px';

    canvas.appendChild(confirmEl);

    // 绑定确认按钮
    var self = this;
    var yesBtn = document.getElementById('confirm-yes');
    var noBtn = document.getElementById('confirm-no');

    if (yesBtn) {
      yesBtn.addEventListener('click', function () {
        self._travelToNode(node);
      });
    }

    if (noBtn) {
      noBtn.addEventListener('click', function () {
        self._removeConfirm();
      });
    }

    // 点击外部取消
    var outsideCancel = function (e) {
      if (!e.target.closest('.node-confirm') && !e.target.closest('.map-node')) {
        self._removeConfirm();
        document.removeEventListener('click', outsideCancel);
      }
    };
    setTimeout(function () {
      document.addEventListener('click', outsideCancel);
    }, 10);
  },

  /* ======================================================================
     _removeConfirm — 移除确认弹窗
     ====================================================================== */
  _removeConfirm: function () {
    var confirmEl = document.getElementById('node-confirm');
    if (confirmEl) {
      confirmEl.remove();
    }
    _confirmNodeId = null;
  },

  /* ======================================================================
     _travelToNode — 执行前往节点
     ====================================================================== */
  _travelToNode: function (node) {
    this._removeConfirm();

    // 1. 更新状态：旧节点标记为 completed，目标节点仍为 available
    // 但第一次到达时，我们需要更新 narrativeHistory
    var narrative = AppState.get('narrativeHistory') || [];
    narrative = narrative.concat(['前往 ' + node.name + '，踏入未知的领域。']);
    AppState.set('narrativeHistory', narrative);

    // 2. 更新当前节点
    _currentNodeId = node.id;

    // 3. 更新节点状态：如果该节点是 available，到达后变为 completed
    var mapNodes = AppState.get('mapNodes') || [];
    var found = false;
    for (var i = 0; i < mapNodes.length; i++) {
      if (mapNodes[i].id === node.id) {
        if (mapNodes[i].status === 'available') {
          mapNodes[i].status = 'completed';
        }
        found = true;
        break;
      }
    }

    if (found) {
      AppState.set('mapNodes', mapNodes);
    }

    // 4. 通知
    Notifications.show('success', '已抵达', '已抵达 ' + node.name, 2500);

    // 5. 确保节点标签保持在 tooltip 上层
    var tooltip = document.getElementById('node-tooltip');
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
  },

  /* ======================================================================
     _getPathStatus — 判断路径线的状态
     ====================================================================== */
  _getPathStatus: function (statusA, statusB) {
    // 如果两个节点都已完成，路径为 completed
    if (statusA === 'completed' && statusB === 'completed') {
      return 'completed';
    }
    // 如果任一为 available，路径为 available
    if (statusA === 'available' || statusB === 'available') {
      return 'available';
    }
    // 其余为 locked
    return 'locked';
  },

  /* ======================================================================
     _determineCurrentNode — 确定当前所在节点
     ====================================================================== */
  _determineCurrentNode: function () {
    if (_currentNodeId) return;

    // 先找最近完成的节点
    var completed = [];
    for (var i = 0; i < _nodes.length; i++) {
      if (_nodes[i].status === 'completed') {
        completed.push(_nodes[i]);
      }
    }

    if (completed.length > 0) {
      // 取最后一个完成的节点
      _currentNodeId = completed[completed.length - 1].id;
      return;
    }

    // 无完成节点，取第一个可用节点
    var avail = [];
    for (var j = 0; j < _nodes.length; j++) {
      if (_nodes[j].status === 'available') {
        avail.push(_nodes[j]);
      }
    }

    if (avail.length > 0) {
      _currentNodeId = avail[0].id;
      return;
    }

    // 回退到第一个节点
    _currentNodeId = _nodes.length > 0 ? _nodes[0].id : null;
  },

  /* ======================================================================
     _countReachable — 计算可前往节点数
     ====================================================================== */
  _countReachable: function () {
    var count = 0;
    var currentNode = this._findNode(_currentNodeId);
    if (!currentNode) return 0;

    for (var i = 0; i < currentNode.connections.length; i++) {
      var target = this._findNode(currentNode.connections[i]);
      if (target && target.status === 'available') {
        count++;
      }
    }

    return count;
  },

  /* ======================================================================
     _countCompleted — 计算已完成节点数
     ====================================================================== */
  _countCompleted: function () {
    var count = 0;
    for (var i = 0; i < _nodes.length; i++) {
      if (_nodes[i].status === 'completed') {
        count++;
      }
    }
    return count;
  },

  /* ======================================================================
     _updateNodes — 更新所有节点的 DOM 状态（无需全量重绘）
     ====================================================================== */
  _updateNodes: function () {
    var container = document.getElementById('map-nodes');
    if (!container) return;

    var self = this;
    _nodes.forEach(function (node) {
      var el = document.getElementById('node-' + node.id);
      if (!el) return;

      // 更新 class（status 样式）
      el.className = 'map-node ' + node.status;
      el.dataset.status = node.status;

      // 更新标签文本
      var label = el.querySelector('.map-node-label');
      if (label) {
        label.textContent = node.name;
      }

      // 已完成节点显示小圆点
      var dot = el.querySelector('.map-node-dot');
      if (node.status === 'completed' && !dot) {
        var newDot = document.createElement('span');
        newDot.className = 'map-node-dot';
        el.appendChild(newDot);
      } else if (node.status !== 'completed' && dot) {
        dot.remove();
      }
    });

    // 重新确定当前节点
    this._determineCurrentNode();
  },

  /* ======================================================================
     _updatePaths — 重新渲染路径线（节点状态变化时）
     ====================================================================== */
  _updatePaths: function () {
    var pathsContainer = document.getElementById('map-paths');
    if (!pathsContainer) return;

    var drawn = {};
    var html = '';
    var self = this;

    for (var i = 0; i < _nodes.length; i++) {
      var node = _nodes[i];
      for (var j = 0; j < node.connections.length; j++) {
        var targetId = node.connections[j];
        var target = self._findNode(targetId);
        if (!target) continue;

        var keyA = node.id < targetId ? node.id + '-' + targetId : targetId + '-' + node.id;
        if (drawn[keyA]) continue;
        drawn[keyA] = true;

        var status = self._getPathStatus(node.status, target.status);
        html += self._buildPathLine(node, target, status);
      }
    }

    pathsContainer.innerHTML = html;
  },

  /* ======================================================================
     _updateStatusBar — 更新底部状态栏
     ====================================================================== */
  _updateStatusBar: function () {
    var statusBar = document.getElementById('map-status');
    if (!statusBar) return;

    statusBar.innerHTML = this._buildStatusBarHTML();

    // 重新渲染 Lucide 图标
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      lucide.createIcons({ app: statusBar });
    }
  },

  /* ======================================================================
     _findNode — 按 ID 查找节点
     ====================================================================== */
  _findNode: function (id) {
    for (var i = 0; i < _nodes.length; i++) {
      if (_nodes[i].id === id) {
        return _nodes[i];
      }
    }
    return null;
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
