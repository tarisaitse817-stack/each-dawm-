/* ==========================================================================
   光之回响 (Echoes of Light) — Particles 粒子系统
   CSS 驱动浮动粒子 + Canvas 动力粒子系统
   ========================================================================== */

export const Particles = {

  /* ---- Canvas 粒子内部状态 ---- */
  _particles: [],
  _rafId: null,
  _ctx: null,
  _canvas: null,
  _isBattleActive: false,
  _isAnimating: false,

  /**
   * 初始化环境粒子系统 + 缓存 Canvas 引用
   * 在 #particles-canvas 下层创建 #ambient-particles 容器，
   * 生成 15 个浮动粒子点（非战斗场景低密度），每个粒子随机位置、大小、动画延迟和浮动半径
   */
  init() {
    // 避免重复创建
    if (document.getElementById('ambient-particles')) return;

    // 缓存 Canvas
    this._canvas = document.getElementById('particles-canvas');
    if (this._canvas) {
      this._ctx = this._canvas.getContext('2d');
      // Canvas 在非战斗时无动画，mousemove 时再激活
    }

    // 创建容器
    var container = document.createElement('div');
    container.id = 'ambient-particles';

    // 插入到 particles-canvas 之前（下层）
    var canvas = document.getElementById('particles-canvas');
    if (canvas && canvas.parentNode) {
      canvas.parentNode.insertBefore(container, canvas);
    } else {
      document.body.appendChild(container);
    }

    // 颜色选项：灵火蓝 / 暖金辉
    var colors = ['#4FC3F7', '#FFD54F'];

    // 非战斗场景 — 15 个浮动粒子（降低密度以优化性能）
    for (var i = 0; i < 15; i++) {
      var dot = document.createElement('div');
      dot.className = 'particle-dot';

      var size = 2 + Math.random() * 4;           // 2–6px
      var dx = (Math.random() - 0.5) * 80;        // –40 ~ 40px
      var dy = (Math.random() - 0.5) * 80;
      var duration = 3 + Math.random() * 3;        // 3–6s
      var delay = Math.random() * 5;               // 0–5s
      var color = colors[Math.floor(Math.random() * colors.length)];

      dot.style.cssText =
        'left:' + (Math.random() * 100) + '%;' +
        'top:' + (Math.random() * 100) + '%;' +
        'width:' + size + 'px;' +
        'height:' + size + 'px;' +
        '--dx:' + dx + 'px;' +
        '--dy:' + dy + 'px;' +
        '--duration:' + duration + 's;' +
        '--delay:' + delay + 's;' +
        'background:' + color + ';';

      container.appendChild(dot);
    }
  },

  /**
   * 战斗粒子爆发 — 使用 Canvas 2D 绘制短暂粒子爆发
   * @param {number} x - 爆发中心 X 坐标（视口坐标系）
   * @param {number} y - 爆发中心 Y 坐标（视口坐标系）
   * @param {number} count - 粒子数量（30-50）
   * @param {string} color - 粒子颜色（CSS 色值）
   */
  spawnBattleParticles(x, y, count, color) {
    // 确保 Canvas 和 context 可用
    if (!this._ctx || !this._canvas) {
      this._canvas = document.getElementById('particles-canvas');
      if (!this._canvas) return;
      this._ctx = this._canvas.getContext('2d');
      if (!this._ctx) return;
    }

    count = Math.min(count || 30, 50);
    color = color || '#4FC3F7';

    // 确保 Canvas 尺寸与视口匹配
    if (this._canvas.width !== window.innerWidth) {
      this._canvas.width = window.innerWidth;
      this._canvas.height = window.innerHeight;
    }

    // 生成粒子
    for (var i = 0; i < count; i++) {
      var angle = Math.random() * Math.PI * 2;
      var speed = 1 + Math.random() * 4;
      var lifetime = 600 + Math.random() * 600;

      this._particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 1 + Math.random() * 3,               // 1–4px
        opacity: 1,
        maxLifetime: lifetime,
        age: 0,
        color: color,
        decay: 0.96 + Math.random() * 0.03
      });
    }

    // 启动动画循环（如果尚未启动）
    this._startParticleLoop();
  },

  /**
   * 启动 Canvas 粒子动画循环
   * 使用 requestAnimationFrame 驱动，无存活粒子时停止
   */
  _startParticleLoop() {
    if (this._rafId) return;

    var self = this;

    function loop() {
      var ctx = self._ctx;
      var canvas = self._canvas;
      if (!ctx || !canvas) return;

      // 清空 Canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      var dt = 16; // ~60fps 时间步长

      // 从后往前遍历以便安全删除
      for (var i = self._particles.length - 1; i >= 0; i--) {
        var p = self._particles[i];
        p.age += dt;

        // 生命周期结束
        if (p.age >= p.maxLifetime) {
          self._particles.splice(i, 1);
          continue;
        }

        // 物理：阻力 + 重力
        p.vx *= p.decay;
        p.vy *= p.decay;
        p.vy += 0.12;   // 微弱重力
        p.x += p.vx;
        p.y += p.vy;

        // 透明度衰减
        p.opacity = Math.max(0, 1 - (p.age / p.maxLifetime));

        // 绘制粒子
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      // 有存活粒子则继续循环，否则停止以节省性能
      if (self._particles.length > 0) {
        self._rafId = requestAnimationFrame(loop);
      } else {
        self._rafId = null;
        self._isAnimating = false;
      }
    }

    this._isAnimating = true;
    loop();
  },

  /**
   * 设置战斗激活状态（影响环境粒子密度）
   * @param {boolean} active - 是否处于战斗场景
   */
  setBattleActive(active) {
    this._isBattleActive = active;
    this._updateAmbientDensity();
  },

  /**
   * 更新环境粒子密度
   * 战斗时全部显示（15个），非战斗时限制（15个 = 不变）
   * 为后续扩展预留：战斗时可增加至25个
   */
  _updateAmbientDensity() {
    var container = document.getElementById('ambient-particles');
    if (!container) return;

    var dots = container.querySelectorAll('.particle-dot');
    var maxCount = this._isBattleActive ? 25 : 15;

    for (var i = 0; i < dots.length; i++) {
      dots[i].style.display = i < maxCount ? '' : 'none';
    }
  },

  /**
   * 停止所有战斗粒子（清场）
   */
  clearBattleParticles() {
    this._particles = [];
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    this._isAnimating = false;
    if (this._ctx && this._canvas) {
      this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    }
  }
};
