/* ==========================================================================
   光之回响 (Echoes of Light) — 通知系统模块
   全局通知函数：4 种类型、进度条、悬停暂停、自动关闭、最多 5 条
   ========================================================================== */

export const Notifications = {
  /* ---- 默认持续时间（毫秒） ---- */
  _durations: {
    info: 4000,
    success: 1500,
    warning: 5000,
    error: 6000
  },

  /* ---- Lucide 图标名映射 ---- */
  _icons: {
    info: 'info',
    success: 'check-circle',
    warning: 'alert-triangle',
    error: 'x-circle'
  },

  /** 最大可见通知数 */
  _maxVisible: 5,

  /** 定时器数据存储 (el -> timerData) */
  _timers: new WeakMap(),

  /* ======================================================================
     Public API
     ====================================================================== */

  /**
   * 显示通知
   * @param {'info'|'success'|'warning'|'error'} type  通知类型
   * @param {string}  title   标题
   * @param {string}  message 消息正文
   * @param {number} [duration] 覆盖默认时长（毫秒）
   */
  show(type, title, message, duration) {
    // 确定时长
    if (duration == null) {
      duration = this._durations[type] || 4000;
    }

    // 获取容器（已在 index.html 中定义 #notification-container）
    var container = document.getElementById('notification-container');
    if (!container) {
      console.warn('[Notifications] #notification-container 不存在');
      return;
    }

    // 限制最大可见数量 — 超出时立即移除最旧的通知（跳过退出动画）
    while (container.children.length >= this._maxVisible) {
      var oldest = container.firstChild;
      this._removeTimer(oldest);
      oldest.remove();
    }

    // 创建通知元素
    var el = document.createElement('div');
    el.className = 'notification ' + type;

    // 构建内部 HTML（进度条时长的 CSS 变量由 JS 单独设置）
    el.innerHTML =
      '<i data-lucide="' + this._icons[type] + '" class="notify-icon"></i>' +
      '<div class="notify-body">' +
        '<div class="notify-title">' + this._escapeHtml(title) + '</div>' +
        '<div class="notify-message">' + this._escapeHtml(message) + '</div>' +
      '</div>' +
      '<button class="notify-close" data-lucide="x" aria-label="关闭"></button>' +
      '<div class="notify-progress">' +
        '<div class="notify-progress-bar"></div>' +
      '</div>';

    container.appendChild(el);

    // 渲染 Lucide 图标（仅限当前通知元素内）
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
      try {
        lucide.createIcons({ app: el });
      } catch (_) {
        lucide.createIcons();
      }
    }

    // 设置进度条时长的 CSS 自定义属性
    var progressBar = el.querySelector('.notify-progress-bar');
    if (progressBar) {
      progressBar.style.setProperty('--duration', duration + 'ms');
    }

    // 定时器数据
    var self = this;
    var timerData = {
      duration: duration,
      elapsed: 0,
      startTime: Date.now(),
      timeoutId: null,
      paused: false
    };

    timerData.timeoutId = setTimeout(function () {
      self.dismiss(el);
    }, duration);

    this._timers.set(el, timerData);

    // ----- 事件绑定 -----

    // 悬停暂停定时器和进度条
    el.addEventListener('mouseenter', function () {
      var data = self._timers.get(el);
      if (!data || data.paused) return;

      clearTimeout(data.timeoutId);
      data.timeoutId = null;
      data.paused = true;
      data.elapsed += Date.now() - data.startTime;

      // 暂停进度条 CSS 动画
      var bar = el.querySelector('.notify-progress-bar');
      if (bar) {
        bar.style.animationPlayState = 'paused';
      }
    });

    // 离开恢复定时器和进度条
    el.addEventListener('mouseleave', function () {
      var data = self._timers.get(el);
      if (!data || !data.paused) return;

      var remaining = Math.max(0, data.duration - data.elapsed);

      if (remaining <= 0) {
        self.dismiss(el);
        return;
      }

      data.startTime = Date.now();
      data.paused = false;
      data.timeoutId = setTimeout(function () {
        self.dismiss(el);
      }, remaining);

      // 重新启动进度条动画（剩余时长）
      var bar = el.querySelector('.notify-progress-bar');
      if (bar) {
        bar.style.animation = 'none';
        // 强制回流以触发新动画
        void bar.offsetHeight;
        bar.style.animation = 'notify-shrink ' + remaining + 'ms linear forwards';
      }
    });

    // 关闭按钮 — 立即关闭
    var closeBtn = el.querySelector('.notify-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.dismiss(el);
      });
    }
  },

  /**
   * 关闭通知（播放退出动画后移除 DOM）
   * @param {Element} el 通知元素
   */
  dismiss(el) {
    // 防止重复调用
    if (el._dismissing) return;
    el._dismissing = true;

    this._removeTimer(el);

    // 播放滑出动画
    el.style.animation = 'notify-out 0.3s ease-in forwards';

    // 动画结束后移除 DOM
    var self = this;
    setTimeout(function () {
      if (el.parentNode) {
        el.parentNode.removeChild(el);
      }
      // 清理 WeakMap 引用
      self._timers.delete(el);
    }, 300);
  },

  /* ======================================================================
     Shortcut Methods — 快捷方法
     ====================================================================== */

  /** 成功通知（绿） */
  success(title, message) {
    this.show('success', title, message);
  },

  /** 警告通知（橙） */
  warning(title, message) {
    this.show('warning', title, message);
  },

  /** 错误通知（红） */
  error(title, message) {
    this.show('error', title, message);
  },

  /** 信息通知（蓝） */
  info(title, message) {
    this.show('info', title, message);
  },

  /* ======================================================================
     Internal
     ====================================================================== */

  /**
   * 清除元素的定时器（不中断动画）
   * @private
   */
  _removeTimer(el) {
    var data = this._timers.get(el);
    if (data) {
      if (data.timeoutId) {
        clearTimeout(data.timeoutId);
      }
      this._timers.delete(el);
    }
  },

  /**
   * HTML 转义 — 防止 XSS
   * @private
   */
  _escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }
};
