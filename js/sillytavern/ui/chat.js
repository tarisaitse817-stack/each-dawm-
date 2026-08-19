/**
 * AI 聊天主界面（Chat.tsx + ChatModal + VariablePanel 的 vanilla 移植）
 * 左侧会话列表 + 右侧消息区/变量面板/输入栏；头部可打开设置/世界书/预设。
 */

import { sillytavernStore } from '../store.js?v=19';
import { USER_ROLE } from '../variables.js?v=19';
import { el, makeOverlay, showToast } from './dom.js?v=19';
import { openSettingsModal } from './settings-modal.js?v=19';
import { openLorebookModal } from './lorebook-modal.js?v=19';
import { openPresetModal } from './preset-modal.js?v=19';

export function openChatModal() {
  const { panel, close } = makeOverlay(() => { cleanup(); }, { zIndex: 1105, center: true });
  panel.classList.add('st-chat-panel');

  const sessionList = el('div', { class: 'st-chat-sessions' });
  const messagesBox = el('div', { class: 'st-chat-messages' });
  const varBox = el('div', { class: 'st-variable-panel' });

  // 输入栏常驻，不在重渲时重建（避免丢失焦点）
  const inputEl = el('input', {
    class: 'st-input st-chat-input',
    type: 'text',
    placeholder: '输入消息...',
  });
  const sendBtn = el('button', { class: 'st-btn st-btn-green', on: { click: handleSend } }, '发送');

  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleSend();
  });

  async function handleSend() {
    const content = inputEl.value.trim();
    if (!content || sillytavernStore.isSending) return;
    if (!sillytavernStore.activeChatId) {
      showToast('请先创建一个对话');
      return;
    }
    if (!sillytavernStore.settings?.api?.apiKey) {
      showToast('请先在设置中填写 API Key');
      return;
    }
    inputEl.value = '';
    try {
      await sillytavernStore.sendMessage(content);
    } catch (err) {
      alert('发送失败: ' + err.message);
    }
  }

  panel.append(
    el('header', { class: 'st-modal-header' }, [
      el('strong', {}, 'AI 聊天'),
      el('button', { class: 'st-btn-sm', on: { click: () => openLorebookModal() } }, '世界书'),
      el('button', { class: 'st-btn-sm', on: { click: () => openPresetModal() } }, '预设'),
      el('button', { class: 'st-btn-sm', on: { click: () => openSettingsModal() } }, '设置'),
      el('span', { style: { flex: 1 } }),
      el('button', { class: 'st-close', on: { click: () => close() } }, '×'),
    ]),
    el('div', { class: 'st-chat-body' }, [
      sessionList,
      el('div', { class: 'st-chat-main' }, [
        messagesBox,
        varBox,
        el('div', { class: 'st-chat-inputbar' }, [
          inputEl,
          sendBtn,
        ]),
      ]),
    ]),
  );

  function renderSessions() {
    sessionList.replaceChildren(
      el('button', {
        class: 'st-btn',
        on: { click: async () => {
          try {
            await sillytavernStore.createChat();
          } catch (e) {
            alert('创建失败: ' + e.message);
          }
        } },
      }, '+ 新建对话'),
    );

    const chats = sillytavernStore.chats;
    if (chats.length === 0) {
      sessionList.append(el('div', { class: 'st-empty' }, '暂无对话'));
      return;
    }
    for (const c of chats) {
      sessionList.append(el('div', {
        class: 'st-chat-session' + (c.id === sillytavernStore.activeChatId ? ' active' : ''),
        on: { click: () => sillytavernStore.loadChat(c.id) },
      }, [
        el('span', { class: 'st-chat-session-name' }, c.name),
        el('button', {
          class: 'st-chat-session-x',
          title: '删除',
          on: { click: (ev) => {
            ev.stopPropagation();
            if (!confirm(`删除对话 "${c.name}"？`)) return;
            sillytavernStore.deleteChat(c.id);
          } },
        }, '×'),
      ]));
    }
  }

  function renderMessages() {
    messagesBox.replaceChildren();
    const chat = sillytavernStore.activeChat;
    if (!chat) {
      messagesBox.append(el('div', { class: 'st-empty' }, '选择一个聊天或创建新对话'));
      return;
    }
    let editingId = null;

    for (const msg of chat.messages) {
      const row = el('div', { class: 'st-message ' + msg.role });

      if (editingId === msg.id) {
        // 编辑态（vanilla 简化：直接双击用户消息弹 prompt 编辑）
      } else {
        row.append(
          el('div', { class: 'st-bubble' }, msg.content),
          el('div', { class: 'st-msg-actions' }, [
            msg.role === USER_ROLE && el('button', {
              class: 'st-btn-sm',
              on: { click: async () => {
                const newContent = prompt('编辑消息（确定后从此处重新生成）', msg.content);
                if (newContent === null || !newContent.trim()) return;
                try {
                  await sillytavernStore.editMessage(msg.id, newContent);
                } catch (e) {
                  alert('操作失败: ' + e.message);
                }
              } },
            }, '编辑并重新生成'),
            el('button', {
              class: 'st-btn-sm',
              on: { click: () => sillytavernStore.deleteMessagesFrom(msg.id) },
            }, '删除后续'),
            el('button', {
              class: 'st-btn-sm',
              on: { click: async () => {
                try {
                  await sillytavernStore.branchFromMessage(msg.id);
                } catch (e) {
                  alert('分支失败: ' + e.message);
                }
              } },
            }, '从此分支'),
          ])
        );
      }
      messagesBox.append(row);
    }
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function renderVariables() {
    varBox.replaceChildren();
    const chat = sillytavernStore.activeChat;
    if (!chat) return;
    const vars = chat.variables || {};
    const keys = Object.keys(vars);

    const toggle = el('button', { class: 'st-btn-sm' }, '变量');
    toggle.addEventListener('click', () => {
      if (varBox.querySelector('.st-variable-editor')) {
        renderVariables();
        return;
      }
      const editor = el('div', { class: 'st-variable-editor' });
      const draft = {};
      for (const [k, v] of Object.entries(vars)) draft[k] = String(v);

      const renderRows = () => {
        editor.replaceChildren();
        const entries = Object.entries(draft);
        entries.forEach(([key, value], idx) => {
          editor.append(el('div', { class: 'st-variable-row' }, [
            el('input', {
              class: 'st-input',
              type: 'text',
              value: key,
              placeholder: '名称',
              on: { input: (e) => {
                const old = Object.keys(draft)[idx];
                delete draft[old];
                draft[e.target.value] = value;
                renderRows();
              } },
            }),
            el('input', {
              class: 'st-input',
              type: 'text',
              value: value,
              placeholder: '值',
              on: { input: (e) => {
                const k = Object.keys(draft)[idx];
                draft[k] = e.target.value;
              } },
            }),
            el('button', {
              class: 'st-btn-sm st-btn-danger',
              on: { click: () => {
                const k = Object.keys(draft)[idx];
                delete draft[k];
                renderRows();
              } },
            }, '删除'),
          ]));
        });
      };

      renderRows();
      editor.append(
        el('button', {
          class: 'st-btn-sm',
          on: { click: () => { draft[''] = ''; renderRows(); } },
        }, '+ 添加'),
        el('button', {
          class: 'st-btn-sm st-btn-green',
          on: { click: async () => {
            const updates = {};
            for (const [k, v] of Object.entries(draft)) {
              if (k.trim()) {
                const num = Number(v);
                updates[k.trim()] = Number.isNaN(num) ? v : num;
              }
            }
            await sillytavernStore.updateVariables(updates);
          } },
        }, '保存'),
      );
      varBox.append(editor);
    });

    varBox.append(toggle);
    if (keys.length > 0) {
      varBox.append(el('ul', { class: 'st-variable-list' },
        keys.map((k) => el('li', {}, `${k}: ${vars[k]}`))));
    }
  }

  function render() {
    renderSessions();
    renderMessages();
    renderVariables();
    sendBtn.disabled = sillytavernStore.isSending;
    sendBtn.textContent = sillytavernStore.isSending ? '发送中...' : '发送';
    if (!sillytavernStore.activeChatId) {
      messagesBox.replaceChildren(el('div', { class: 'st-empty' }, '选择一个聊天或创建新对话'));
    }
  }

  const unsub = sillytavernStore.subscribe(render);
  function cleanup() { unsub(); }

  render();
  return { close };
}
