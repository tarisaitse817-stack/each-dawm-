/**
 * 轻量 DOM 构建工具（vanilla UI 组件共用）
 */

/**
 * 创建元素。
 * @param {string} tag 标签名
 * @param {Object} [attrs] 属性对象；特殊键：class, on（事件映射）, style（对象）
 * @param {...(Node|string|Array)} children 子节点；字符串转 textContent
 */
export function el(tag, attrs, ...children) {
  const node = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null) continue;
      if (k === 'class') node.className = v;
      else if (k === 'on') {
        for (const [ev, fn] of Object.entries(v)) node.addEventListener(ev, fn);
      } else if (k === 'style' && typeof v === 'object') {
        Object.assign(node.style, v);
      } else if (k in node && typeof node[k] !== 'object') {
        try { node[k] = v; } catch { node.setAttribute(k, v); }
      } else {
        node.setAttribute(k, v);
      }
    }
  }
  appendChildren(node, children);
  return node;
}

function appendChildren(node, children) {
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c instanceof Node ? c : String(c));
  }
}

let toastTimer = null;

/** 全局 Toast 提示 */
export function showToast(message) {
  let toast = document.querySelector('.st-toast');
  if (!toast) {
    toast = el('div', { class: 'st-toast' });
    document.body.append(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

/**
 * 创建遮罩层。点击遮罩空白处触发 onClose。
 * @param {Function} onClose 关闭回调（卸载 DOM）
 * @param {Object} [opts] { center: 是否居中面板, zIndex }
 * @returns {{ root: HTMLElement, panel: HTMLElement, close: Function }}
 */
export function makeOverlay(onClose, opts = {}) {
  const zIndex = opts.zIndex || 100;
  const root = el('div', { class: 'st-overlay', style: { zIndex } });
  const panel = el('div', {
    class: opts.center ? 'st-panel st-panel-center' : 'st-panel st-panel-right',
    on: { click: (e) => e.stopPropagation() },
  });
  root.append(panel);
  root.addEventListener('click', () => {
    // 仅空白处点击关闭（panel 内已 stopPropagation）
    close();
  });
  document.body.append(root);

  function close() {
    if (!root.parentNode) return;
    root.remove();
    onClose && onClose();
  }
  // Esc 关闭
  const escHandler = (e) => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', escHandler);
  const origRemove = close;
  close = () => { document.removeEventListener('keydown', escHandler); origRemove(); };

  return { root, panel, close };
}

/** 构建一个 label 包裹的字段行 */
export function fieldRow(labelText, child, opts = {}) {
  return el('label', { class: 'st-field' + (opts.inline ? ' st-field-inline' : '') }, [
    el('span', { class: 'st-field-label' }, labelText),
    child,
  ]);
}

/** 单选组 */
export function radioGroup(name, options, checked, onChange) {
  const wrap = el('div', { class: 'st-radio-group' });
  for (const opt of options) {
    wrap.append(el('label', { class: 'st-radio' }, [
      el('input', {
        type: 'radio',
        name,
        checked: checked === opt.value,
        on: { change: () => onChange(opt.value) },
      }),
      opt.label,
    ]));
  }
  return wrap;
}
