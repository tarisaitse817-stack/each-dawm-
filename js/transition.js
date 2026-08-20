/* ==========================================================================
   光之回响 (Echoes of Light) — TransitionView 开场/读档光晕转场
   黑底逐句字幕（galgame 式）→ 光晕铺满 → 淡出露出场景；纯 CSS 视觉 + JS 时序
   ========================================================================== */

export const TransitionView = {

  /** @type {HTMLElement|null} 转场覆盖层（惰性创建，play 时初始化） */
  _overlay: null,

  /** @type {HTMLElement|null} 字幕元素 */
  _subtitleEl: null,

  /** @type {boolean} 转场播放中（防重入守卫） */
  isPlaying: false,

  /** @type {boolean} 字幕阶段是否被点击跳过 */
  _skipSubtitle: false,

  /** @type {number} 字幕淡入/淡出时长（毫秒，与 CSS transition 一致） */
  _fadeMs: 400,

  /** @type {number} 光晕动画时长（毫秒，与 CSS keyframes 一致） */
  _haloMs: 1000,

  /**
   * 惰性创建覆盖层 DOM（首次 play 时调用；失败抛出由 play 捕获）
   */
  _init() {
    this._overlay = document.createElement('div');
    this._overlay.id = 'transition-overlay';
    this._overlay.className = 'hidden';
    this._overlay.innerHTML =
      '<div class="transition-cg" id="transition-cg"></div>' +
      '<div class="transition-subtitle" id="transition-subtitle"></div>' +
      '<div class="transition-halo"></div>';
    document.body.appendChild(this._overlay);
    this._subtitleEl = document.getElementById('transition-subtitle');
  },

  /**
   * 开场 CG 轮切（用户要求）：黑屏阶段轮播已解锁角色的 CG
   * 双图交叉淡入淡出，每 2.5s 切换；halo 开始时停止
   * @param {string[]} slides - CG 图片 URL 列表
   */
  _startCgSlideshow(slides) {
    this._stopCgSlideshow();
    if (!slides || slides.length === 0) return;
    var el = this._overlay && this._overlay.querySelector('.transition-cg');
    if (!el) return;

    var imgs = [];
    for (var i = 0; i < 2; i++) {
      var img = document.createElement('img');
      img.className = 'transition-cg-img';
      el.appendChild(img);
      imgs.push(img);
    }
    var idx = 0;
    imgs[0].src = slides[0];
    imgs[0].style.opacity = '1';
    idx = 1;

    this._cgTimer = setInterval(function () {
      if (!slides.length) return;
      var cur = imgs[idx % 2];
      var next = imgs[(idx + 1) % 2];
      next.src = slides[idx % slides.length];
      next.style.opacity = '1';
      cur.style.opacity = '0';
      idx++;
    }, 2500);
  },

  _stopCgSlideshow() {
    if (this._cgTimer) {
      clearInterval(this._cgTimer);
      this._cgTimer = null;
    }
    var el = this._overlay && this._overlay.querySelector('.transition-cg');
    if (el) el.innerHTML = '';
  },

  /**
   * 播放转场
   * @param {{ lines: string[]|null, onDone?: Function, clickAdvance?: boolean }} opts
   *        lines 为句子数组（逐句字幕）；null 直接光晕（读档）；
   *        clickAdvance = 每句字幕等待点击后推进下一句（黑屏开场文本模式）；
   *        onDone 在转场完全结束（淡出完成后）回调
   */
  play(opts) {
    if (this.isPlaying) return;
    if (!this._overlay) {
      try {
        this._init();
      } catch (e) {
        // 覆盖层创建失败：跳过动画直接进场景，不阻塞进入
        console.warn('[TransitionView] 覆盖层创建失败，跳过转场动画');
        return;
      }
    }

    var lines = (opts && opts.lines) || null;
    var onDone = (opts && opts.onDone) || null;
    this._clickAdvance = !!(opts && opts.clickAdvance);
    var self = this;

    this.isPlaying = true;
    this._skipSubtitle = false;
    this._overlay.classList.remove('hidden', 'fade-out', 'halo');
    this._subtitleEl.classList.remove('show');
    this._subtitleEl.textContent = '';

    // 开场 CG 轮切（用户要求）：黑屏阶段轮播已解锁角色 CG
    this._startCgSlideshow((opts && opts.cgSlides) || null);

    var startHalo = function () {
      self._stopCgSlideshow();
      self._overlay.classList.add('halo');
      setTimeout(function () {
        self._overlay.classList.add('fade-out');
        setTimeout(function () {
          self._overlay.classList.add('hidden');
          self._overlay.classList.remove('fade-out', 'halo');
          self.isPlaying = false;
          if (onDone) onDone();
        }, self._fadeMs);
      }, self._haloMs);
    };

    if (!lines || lines.length === 0) {
      startHalo();
      return;
    }

    var clickHandler = function () { self._skipSubtitle = true; };
    // 点击推进模式：点击用于逐句推进（不再整体跳过）
    if (!this._clickAdvance) {
      this._overlay.addEventListener('click', clickHandler);
    }

    this._playLines(lines, 0, function () {
      if (!self._clickAdvance) {
        self._overlay.removeEventListener('click', clickHandler);
      }
      self._subtitleEl.classList.remove('show');
      startHalo();
    });
  },

  /**
   * 逐句播放字幕：淡入 → 停留 → 淡出 → 下一句（被跳过时直接结束）
   * clickAdvance 模式：淡入后等待一次点击再推进下一句
   * @param {string[]} lines
   * @param {number} index
   * @param {Function} done - 全部播完（或被跳过）后的回调
   */
  _playLines(lines, index, done) {
    var self = this;
    if (this._skipSubtitle || index >= lines.length) { done(); return; }
    this._subtitleEl.textContent = lines[index];
    this._subtitleEl.classList.add('show');

    if (this._clickAdvance) {
      this._overlay.addEventListener('click', function advance() {
        self._overlay.removeEventListener('click', advance);
        self._subtitleEl.classList.remove('show');
        setTimeout(function () {
          self._playLines(lines, index + 1, done);
        }, self._fadeMs);
      }, { once: true });
      return;
    }

    var stayMs = Math.max(1200, lines[index].length * 80);
    setTimeout(function () {
      self._subtitleEl.classList.remove('show');
      setTimeout(function () {
        self._playLines(lines, index + 1, done);
      }, self._fadeMs);
    }, stayMs);
  }
};
