/**
 * 设置面板（SettingsModal 的 vanilla 移植）
 * 标签页：主 API / 次 API / 标签 / 格式提示词 / 显示 / 备份
 */

import { sillytavernStore } from '../store.js?v=22';
import { DEFAULT_FORMAT_PROMPT } from '../types.js?v=22';
import { fetchModels, testConnection } from '../api-tools.js?v=22';
import { exportAllData, importAllData, clearAllData } from '../database.js?v=22';
import { el, makeOverlay, fieldRow, radioGroup, showToast } from './dom.js?v=22';

const TABS = [
  { id: 'primary', label: '主 API' },
  { id: 'secondary', label: '次 API' },
  { id: 'tags', label: '标签' },
  { id: 'prompt', label: '格式提示词' },
  { id: 'display', label: '显示' },
  { id: 'backup', label: '备份' },
];

export function openSettingsModal() {
  const { panel, close } = makeOverlay(() => { cleanup(); }, { zIndex: 1110 });
  panel.classList.add('st-settings');

  let tab = 'primary';
  let primaryModels = [];
  let secondaryModels = [];
  let busy = null;

  const tabBar = el('div', { class: 'st-tabs' });
  const body = el('div', { class: 'st-settings-body' });

  panel.append(
    el('header', { class: 'st-modal-header' }, [
      el('strong', {}, '设置'),
      el('button', { class: 'st-close', on: { click: () => close() } }, '×'),
    ]),
    tabBar,
    body,
  );

  function renderTabs() {
    tabBar.replaceChildren();
    for (const t of TABS) {
      tabBar.append(el('button', {
        class: 'st-tab' + (tab === t.id ? ' active' : ''),
        on: { click: () => { tab = t.id; render(); } },
      }, t.label));
    }
  }

  function render() {
    renderTabs();
    body.replaceChildren();
    const settings = sillytavernStore.settings;
    if (!settings) {
      body.append(el('div', { class: 'st-empty' }, '加载中…'));
      return;
    }
    const isDual = settings.apiMode === 'dual';
    const secondary = settings.api.secondary ?? {
      enabled: false, baseUrl: '', apiKey: '', model: '', temperature: 0.7, maxTokens: 8000,
    };

    const updateSettings = (patch) => sillytavernStore.updateSettings(patch);
    const updateApi = (patch) => updateSettings({ api: { ...settings.api, ...patch } });
    const updateSecondary = (patch) => updateSettings({
      api: { ...settings.api, secondary: { ...secondary, ...patch } },
    });

    async function handleFetchModels(which) {
      setBusy(`fetch-${which}`);
      try {
        const target = which === 'primary'
          ? { baseUrl: settings.api.baseUrl, apiKey: settings.api.apiKey }
          : { baseUrl: secondary.baseUrl, apiKey: secondary.apiKey };
        const { models, source, error } = await fetchModels(target);
        if (which === 'primary') primaryModels = models; else secondaryModels = models;
        if (source === 'remote') {
          showToast(`已获取 ${models.length} 个模型`);
        } else if (error) {
          showToast(`获取失败 (${error}),已显示常用模型`);
        }
      } finally {
        setBusy(null);
      }
    }

    async function handleTestConnection(which) {
      setBusy(`test-${which}`);
      try {
        const target = which === 'primary'
          ? { baseUrl: settings.api.baseUrl, apiKey: settings.api.apiKey, model: settings.api.model }
          : { baseUrl: secondary.baseUrl, apiKey: secondary.apiKey, model: secondary.model };
        const result = await testConnection(target);
        if (result.ok) {
          showToast(`${which === 'primary' ? '主' : '次'} API 连通性测试通过`);
        } else if (result.status) {
          alert(`测试失败: HTTP ${result.status}\n${result.errorBody ?? ''}`);
        } else {
          alert(`测试失败: ${result.error ?? '未知错误'}`);
        }
      } finally {
        setBusy(null);
      }
    }

    function setBusy(v) {
      busy = v;
      render();
    }

    function modelSelect(models, onPick) {
      if (!models.length) return null;
      return el('select', {
        class: 'st-select',
        on: { change: (e) => { if (e.target.value) onPick(e.target.value); } },
      }, [
        el('option', { value: '' }, `-- 选择模型 (${models.length}) --`),
        ...models.map((m) => el('option', { value: m }, m)),
      ]);
    }

    function apiButtons(which) {
      return el('div', { class: 'st-row' }, [
        el('button', {
          class: 'st-btn',
          disabled: busy !== null,
          on: { click: () => handleFetchModels(which) },
        }, busy === `fetch-${which}` ? '获取中…' : '获取模型列表'),
        el('button', {
          class: 'st-btn',
          disabled: busy !== null,
          on: { click: () => handleTestConnection(which) },
        }, busy === `test-${which}` ? '测试中…' : '测试连通性'),
      ]);
    }

    if (tab === 'primary') {
      body.append(
        el('div', { class: 'st-form-col' }, [
          fieldRow('API 模式', el('select', {
            class: 'st-select',
            on: { change: (e) => updateSettings({ apiMode: e.target.value }) },
          }, [
            el('option', { value: 'single', selected: settings.apiMode === 'single' }, '单 API (一个 LLM 处理所有任务)'),
            el('option', { value: 'dual', selected: settings.apiMode === 'dual' }, '双 API (主 API 剧情 + 次 API 变量)'),
          ])),
          el('small', { class: 'st-hint' },
            isDual
              ? '双 API 模式: 主 API 负责剧情/对话, 次 API 负责变量更新等次要任务。'
              : '单 API 模式: 主 API 同时负责剧情和变量。'),
          fieldRow('Base URL', el('input', {
            class: 'st-input',
            type: 'text',
            value: settings.api.baseUrl,
            placeholder: 'https://api.openai.com/v1',
            on: { input: (e) => updateApi({ baseUrl: e.target.value }) },
          })),
          fieldRow('API Key', el('input', {
            class: 'st-input',
            type: 'password',
            value: settings.api.apiKey,
            placeholder: 'sk-...',
            on: { input: (e) => updateApi({ apiKey: e.target.value }) },
          })),
          fieldRow('Model', [
            el('input', {
              class: 'st-input',
              type: 'text',
              value: settings.api.model,
              placeholder: 'gpt-3.5-turbo',
              on: { input: (e) => updateApi({ model: e.target.value }) },
            }),
            modelSelect(primaryModels, (m) => updateApi({ model: m })),
          ]),
          apiButtons('primary'),
          el('hr', { class: 'st-hr' }),
          fieldRow('用户名', el('input', {
            class: 'st-input',
            type: 'text',
            value: settings.userName,
            on: { input: (e) => updateSettings({ userName: e.target.value }) },
          })),
          fieldRow('角色名', el('input', {
            class: 'st-input',
            type: 'text',
            value: settings.characterName,
            on: { input: (e) => updateSettings({ characterName: e.target.value }) },
          })),
        ])
      );
    } else if (tab === 'secondary') {
      body.append(
        el('div', { class: 'st-form-col' }, [
          !isDual && el('div', { class: 'st-notice' },
            '当前为单 API 模式。在「主 API」面板切换到双 API 模式以启用此页面的配置。'),
          fieldRow('Base URL', el('input', {
            class: 'st-input',
            type: 'text',
            value: secondary.baseUrl,
            placeholder: 'https://api.deepseek.com/v1',
            on: { input: (e) => updateSecondary({ baseUrl: e.target.value, enabled: true }) },
          })),
          fieldRow('API Key', el('input', {
            class: 'st-input',
            type: 'password',
            value: secondary.apiKey,
            placeholder: 'sk-...',
            on: { input: (e) => updateSecondary({ apiKey: e.target.value, enabled: true }) },
          })),
          fieldRow('Model', [
            el('input', {
              class: 'st-input',
              type: 'text',
              value: secondary.model,
              placeholder: 'deepseek-chat',
              on: { input: (e) => updateSecondary({ model: e.target.value, enabled: true }) },
            }),
            modelSelect(secondaryModels, (m) => updateSecondary({ model: m, enabled: true })),
          ]),
          el('div', { class: 'st-row' }, [
            fieldRow('温度 (0-2)', el('input', {
              class: 'st-input',
              type: 'number',
              min: 0, max: 2, step: 0.1,
              value: secondary.temperature ?? 0.7,
              on: { input: (e) => updateSecondary({ temperature: Number(e.target.value), enabled: true }) },
            })),
            fieldRow('Max Tokens', el('input', {
              class: 'st-input',
              type: 'number',
              min: 1, max: 32768,
              value: secondary.maxTokens ?? 8000,
              on: { input: (e) => updateSecondary({ maxTokens: Number(e.target.value), enabled: true }) },
            })),
          ]),
          apiButtons('secondary'),
        ])
      );
    } else if (tab === 'tags') {
      const tagsBox = el('div', { class: 'st-tags' });
      const renderTags = () => {
        tagsBox.replaceChildren();
        settings.customTags.forEach((t, i) => {
          tagsBox.append(el('span', { class: 'st-tag' }, [
            t + ' ',
            el('button', {
              class: 'st-tag-x',
              on: { click: () => {
                sillytavernStore.updateSettings({
                  customTags: settings.customTags.filter((_, j) => j !== i),
                });
              } },
            }, '×'),
          ]));
        });
      };
      renderTags();
      body.append(
        el('div', {}, [
          el('p', { class: 'st-hint' }, '注册标签由解析器识别。删除 maintext / option / sum / vars / thinking 会破坏默认 UI。'),
          tagsBox,
          el('button', {
            class: 'st-btn',
            on: { click: () => {
              const v = prompt('新标签名(小写、无空格)');
              if (v && /^[a-z][a-z0-9_-]*$/.test(v)) {
                sillytavernStore.updateSettings({ customTags: [...settings.customTags, v] });
                renderTags();
              }
            } },
          }, '+ 新增'),
        ])
      );
    } else if (tab === 'prompt') {
      body.append(
        el('div', {}, [
          el('textarea', {
            class: 'st-textarea',
            on: { input: (e) => updateSettings({ formatPromptTemplate: e.target.value }) },
          }, settings.formatPromptTemplate),
          el('button', {
            class: 'st-btn',
            on: { click: () => { updateSettings({ formatPromptTemplate: DEFAULT_FORMAT_PROMPT }); render(); } },
          }, '恢复默认'),
        ])
      );
    } else if (tab === 'display') {
      body.append(
        el('div', { class: 'st-form-col' }, [
          el('fieldset', { class: 'st-fieldset' }, [
            el('legend', {}, '思考过程显示'),
            radioGroup('thinking', [
              { value: 'fold', label: '折叠' },
              { value: 'hide', label: '隐藏' },
              { value: 'inline', label: '同区' },
            ], settings.thinkingDisplay, (v) => updateSettings({ thinkingDisplay: v })),
          ]),
          el('fieldset', { class: 'st-fieldset' }, [
            el('legend', {}, 'UI 模式'),
            radioGroup('uimode', [
              { value: 'game', label: '游戏' },
              { value: 'chat', label: '聊天' },
            ], settings.uiMode, (v) => updateSettings({ uiMode: v })),
          ]),
        ])
      );
    } else if (tab === 'backup') {
      body.append(
        el('div', { class: 'st-form-col' }, [
          el('fieldset', { class: 'st-fieldset st-fieldset-ok' }, [
            el('legend', {}, '导出'),
            el('p', { class: 'st-hint' }, '将所有世界书、预设、设置、对话导出为单个 JSON 文件。'),
            el('button', {
              class: 'st-btn st-btn-green',
              on: { click: async () => {
                const data = await exportAllData();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sillytavern-backup-${new Date().toISOString().slice(0, 10)}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                showToast('备份已导出');
              } },
            }, '导出全部数据'),
          ]),
          el('fieldset', { class: 'st-fieldset st-fieldset-warn' }, [
            el('legend', {}, '导入'),
            el('p', { class: 'st-hint' }, '从之前导出的备份文件恢复数据。会覆盖现有数据。'),
            el('button', {
              class: 'st-btn st-btn-purple',
              on: { click: () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.json,application/json';
                input.onchange = async (e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  try {
                    const text = await file.text();
                    const backup = JSON.parse(text);
                    if (!confirm(`确认导入备份? 这将覆盖所有现有数据 (${backup.lorebooks?.length ?? 0} 世界书 / ${backup.presets?.length ?? 0} 预设 / ${backup.chats?.length ?? 0} 对话)。`)) return;
                    await importAllData(backup);
                    showToast('备份已导入,请刷新页面以加载');
                  } catch (err) {
                    alert('导入失败: ' + err.message);
                  }
                };
                input.click();
              } },
            }, '导入备份文件'),
          ]),
          el('fieldset', { class: 'st-fieldset st-fieldset-danger' }, [
            el('legend', {}, '清除'),
            el('p', { class: 'st-hint' }, '清除所有本地存储数据。不可恢复。'),
            el('button', {
              class: 'st-btn st-btn-red',
              on: { click: async () => {
                if (!confirm('确定清除所有数据? 此操作不可恢复。')) return;
                if (!confirm('再次确认: 所有世界书、预设、对话、设置都将被删除。')) return;
                await clearAllData();
                showToast('数据已清除,请刷新页面');
              } },
            }, '清除所有数据'),
          ]),
        ])
      );
    }
  }

  const unsub = sillytavernStore.subscribe(() => {
    // 输入框绑定 input 事件直接写入 store，无需重渲。
    // 唯一需要重渲的时机：面板在 store 尚未加载完成时打开，显示「加载中…」，
    // settings 就绪后补一次渲染。
    if (sillytavernStore.settings && body.querySelector('.st-empty')) render();
  });
  function cleanup() { unsub(); }

  render();
  return { close };
}
