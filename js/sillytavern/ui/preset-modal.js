/**
 * 预设管理面板（PresetModal 的 vanilla 移植）
 * 标签页：采样 / Prompt 文本 / 自定义 Prompts / 排序
 */

import { sillytavernStore } from '../store.js?v=36';
import { savePreset, deletePreset } from '../database.js?v=36';
import { createDefaultPreset } from '../types.js?v=36';
import { clampNumber } from '../editor-utils.js?v=36';
import { el, makeOverlay, fieldRow } from './dom.js?v=36';
import { renderPromptOrderEditor } from './prompt-order-editor.js?v=36';

const TABS = [
  { id: 'sampling', label: '采样' },
  { id: 'prompts', label: 'Prompt 文本' },
  { id: 'custom', label: '自定义 Prompts' },
  { id: 'order', label: '排序' },
];

const PROMPT_TEXT_FIELDS = [
  { key: 'main', label: 'Main' },
  { key: 'nsfw', label: 'NSFW' },
  { key: 'jailbreak', label: 'Jailbreak' },
  { key: 'enhanceDefinitions', label: 'Enhance Definitions' },
  { key: 'impersonation_prompt', label: 'Impersonation Prompt' },
  { key: 'new_chat_prompt', label: 'New Chat Prompt' },
  { key: 'new_group_chat_prompt', label: 'New Group Chat Prompt' },
  { key: 'new_example_chat_prompt', label: 'New Example Chat Prompt' },
  { key: 'continue_nudge_prompt', label: 'Continue Nudge Prompt' },
  { key: 'wi_format', label: 'World Info Format' },
  { key: 'group_nudge_prompt', label: 'Group Nudge Prompt' },
  { key: 'scenario_format', label: 'Scenario Format' },
  { key: 'personality_format', label: 'Personality Format' },
];

const SAMPLING_FIELDS = [
  { key: 'temp_openai', label: 'temp_openai (温度)', step: 0.05, min: 0, max: 2, fallback: 0.8 },
  { key: 'top_p_openai', label: 'top_p_openai', step: 0.01, min: 0, max: 1, fallback: 0.9 },
  { key: 'top_k_openai', label: 'top_k_openai', step: 1, min: 0, max: 500, fallback: 0 },
  { key: 'top_a_openai', label: 'top_a_openai', step: 0.01, min: 0, max: 1, fallback: 0 },
  { key: 'min_p_openai', label: 'min_p_openai', step: 0.01, min: 0, max: 1, fallback: 0 },
  { key: 'freq_pen_openai', label: 'freq_pen_openai (频率惩罚)', step: 0.1, min: -2, max: 2, fallback: 0 },
  { key: 'pres_pen_openai', label: 'pres_pen_openai (存在惩罚)', step: 0.1, min: -2, max: 2, fallback: 0 },
  { key: 'repetition_penalty_openai', label: 'repetition_penalty_openai', step: 0.05, min: 0, max: 2, fallback: 1 },
  { key: 'openai_max_context', label: 'openai_max_context', step: 256, min: 256, max: 2000000, fallback: 4096 },
  { key: 'openai_max_tokens', label: 'openai_max_tokens', step: 64, min: 32, max: 32768, fallback: 2048 },
];

export function openPresetModal() {
  const presets = sillytavernStore.presets;
  let selectedId = sillytavernStore.settings?.activePresetId ?? presets[0]?.id ?? null;
  let draft = presets.find((p) => p.id === selectedId) ?? null;
  let tab = 'sampling';

  const { panel, close } = makeOverlay(() => { cleanup(); }, { zIndex: 1200, center: true });
  panel.classList.add('st-preset');

  const presetList = el('div', { class: 'st-preset-list' });
  const body = el('div', { class: 'st-preset-body' });
  const saveBtn = el('button', { class: 'st-btn st-btn-green', on: { click: handleSave } }, '保存');
  const activateBtn = el('button', { class: 'st-btn', on: { click: handleActivate } }, '设为激活');
  const deleteBtn = el('button', { class: 'st-btn st-btn-danger', on: { click: handleDelete } }, '删除');

  const tabBar = el('div', { class: 'st-tabs' });

  panel.append(
    el('header', { class: 'st-modal-header' }, [
      el('strong', {}, '预设管理'),
      el('button', { class: 'st-btn-sm', on: { click: handleNewPreset } }, '+ 新建'),
      activateBtn,
      deleteBtn,
      el('span', { style: { flex: 1 } }),
      saveBtn,
      el('button', { class: 'st-close', on: { click: tryClose } }, '×'),
    ]),
    el('div', { class: 'st-editor-main' }, [presetList, body]),
  );

  function isDirty() {
    if (!draft) return false;
    const original = sillytavernStore.presets.find((p) => p.id === draft.id);
    if (!original) return false;
    return draft.name !== original.name || JSON.stringify(draft.settings) !== JSON.stringify(original.settings);
  }

  function patchSettings(patch) {
    if (!draft) return;
    draft = { ...draft, settings: { ...draft.settings, ...patch } };
    refreshSaveState();
  }

  function patchName(name) {
    if (!draft) return;
    draft = { ...draft, name };
    refreshSaveState();
  }

  function refreshSaveState() {
    const dirty = isDirty();
    saveBtn.disabled = !dirty;
    saveBtn.classList.toggle('disabled', !dirty);
    activateBtn.disabled = sillytavernStore.settings?.activePresetId === draft?.id;
    activateBtn.textContent = sillytavernStore.settings?.activePresetId === draft?.id ? '当前已激活' : '设为激活';
  }

  function tryClose() {
    if (isDirty() && !confirm('放弃未保存的修改?')) return;
    close();
  }

  async function handleSave() {
    if (!draft) return;
    try {
      await savePreset(draft);
      renderList();
    } catch (e) {
      alert('保存失败: ' + e.message);
    }
  }

  async function handleActivate() {
    if (!draft) return;
    await sillytavernStore.updateSettings({ activePresetId: draft.id });
    renderList();
    refreshSaveState();
  }

  async function handleNewPreset() {
    const name = prompt('新预设名称', '新预设');
    if (!name) return;
    const base = createDefaultPreset();
    const p = {
      ...base,
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await savePreset(p);
    selectedId = p.id;
    draft = p;
    renderAll();
  }

  async function handleDelete() {
    if (!draft) return;
    if (!confirm(`删除预设 "${draft.name}"?`)) return;
    await deletePreset(draft.id);
    const remaining = sillytavernStore.presets.filter((p) => p.id !== draft.id);
    selectedId = remaining[0]?.id ?? null;
    draft = remaining[0] ?? null;
    renderAll();
  }

  function handleSelectPreset(id) {
    if (isDirty() && !confirm('当前预设有未保存修改,确定切换?')) return;
    selectedId = id;
    draft = sillytavernStore.presets.find((p) => p.id === id) ?? null;
    renderAll();
  }

  function renderList() {
    presetList.replaceChildren();
    const ps = sillytavernStore.presets;
    if (ps.length === 0) {
      presetList.append(el('div', { class: 'st-empty' }, '暂无预设'));
      return;
    }
    for (const p of ps) {
      presetList.append(el('div', {
        class: 'st-preset-item' + (p.id === selectedId ? ' active' : ''),
        on: { click: () => handleSelectPreset(p.id) },
      }, `${sillytavernStore.settings?.activePresetId === p.id ? '★ ' : ''}${p.name}`));
    }
  }

  function renderTabs() {
    tabBar.replaceChildren();
    for (const t of TABS) {
      tabBar.append(el('button', {
        class: 'st-tab' + (tab === t.id ? ' active' : ''),
        on: { click: () => { tab = t.id; renderBody(); } },
      }, t.label));
    }
  }

  function numberField(f, value) {
    return fieldRow(f.label, el('input', {
      class: 'st-input st-num',
      type: 'number',
      step: f.step,
      min: f.min,
      max: f.max,
      value: value ?? f.fallback,
      on: { input: (e) => patchSettings({ [f.key]: clampNumber(e.target.value, f.min, f.max, f.fallback) }) },
    }));
  }

  function textAreaField(label, value, onInput, rows = 4) {
    return fieldRow(label, el('textarea', {
      class: 'st-textarea',
      on: { input: (e) => onInput(e.target.value) },
    }, value ?? ''));
  }

  function renderBody() {
    body.replaceChildren();
    if (!draft) {
      body.append(el('div', { class: 'st-empty' }, '选择左侧预设或新建一个'));
      return;
    }

    body.append(
      el('label', { class: 'st-preset-name-row' }, [
        '名称:',
        el('input', {
          class: 'st-input',
          type: 'text',
          value: draft.name,
          on: { input: (e) => patchName(e.target.value) },
        }),
      ]),
      tabBar,
    );

    if (tab === 'sampling') {
      body.append(el('div', { class: 'st-sampling-grid' },
        SAMPLING_FIELDS.map((f) => numberField(f, draft.settings[f.key]))));
      body.append(
        fieldRow('openai_model', el('input', {
          class: 'st-input',
          type: 'text',
          value: draft.settings.openai_model ?? '',
          placeholder: 'gpt-3.5-turbo',
          on: { input: (e) => patchSettings({ openai_model: e.target.value }) },
        })),
        el('div', { class: 'st-row st-checks' }, [
          el('label', {}, [
            el('input', {
              type: 'checkbox',
              checked: !!draft.settings.stream_openai,
              on: { change: (e) => patchSettings({ stream_openai: e.target.checked }) },
            }),
            ' stream_openai',
          ]),
          el('label', {}, [
            el('input', {
              type: 'checkbox',
              checked: !!draft.settings.max_context_unlocked,
              on: { change: (e) => patchSettings({ max_context_unlocked: e.target.checked }) },
            }),
            ' max_context_unlocked',
          ]),
        ])
      );
    } else if (tab === 'prompts') {
      body.append(el('div', {},
        PROMPT_TEXT_FIELDS.map((f) => textAreaField(`${f.label} (${f.key})`, draft.settings[f.key], (v) => patchSettings({ [f.key]: v })))));
    } else if (tab === 'custom') {
      const customBox = el('div', {});
      const renderCustom = () => {
        customBox.replaceChildren();
        const prompts = draft.settings.prompts ?? [];
        if (prompts.length === 0) {
          customBox.append(el('div', { class: 'st-empty' }, '无自定义 prompt'));
        }
        prompts.forEach((p, idx) => {
          customBox.append(el('div', { class: 'st-custom-prompt' }, [
            el('div', { class: 'st-row' }, [
              el('code', { class: 'st-order-id' }, p.identifier),
              el('select', {
                class: 'st-select',
                on: { change: (e) => {
                  const list = (draft.settings.prompts ?? []).slice();
                  list[idx] = { ...list[idx], role: e.target.value };
                  patchSettings({ prompts: list });
                } },
              }, [
                el('option', { value: 'system', selected: (p.role ?? 'system') === 'system' }, 'system'),
                el('option', { value: 'user', selected: p.role === 'user' }, 'user'),
                el('option', { value: 'assistant', selected: p.role === 'assistant' }, 'assistant'),
              ]),
              el('span', { style: { flex: 1 } }),
              el('button', {
                class: 'st-btn-sm st-btn-danger',
                on: { click: () => {
                  if (!confirm('删除此 prompt?')) return;
                  patchSettings({ prompts: (draft.settings.prompts ?? []).filter((_, i) => i !== idx) });
                } },
              }, '删除'),
            ]),
            el('textarea', {
              class: 'st-textarea',
              on: { input: (e) => {
                const list = (draft.settings.prompts ?? []).slice();
                list[idx] = { ...list[idx], content: e.target.value };
                patchSettings({ prompts: list });
              } },
            }, p.content ?? ''),
          ]));
        });
      };
      renderCustom();
      body.append(
        el('button', {
          class: 'st-btn',
          on: { click: () => {
            const current = draft.settings.prompts ?? [];
            const id = prompt('新 prompt 的 identifier (英文/下划线)', 'custom_' + (current.length + 1));
            if (!id) return;
            if (current.some((p) => p.identifier === id)) {
              alert('identifier 已存在');
              return;
            }
            patchSettings({ prompts: [...current, { identifier: id, role: 'system', content: '' }] });
            renderBody();
          } },
        }, '+ 新建自定义 prompt'),
        customBox,
      );
    } else if (tab === 'order') {
      renderPromptOrderEditor(body, draft.settings.prompt_order ?? [], (next) => patchSettings({ prompt_order: next }));
    }
  }

  function renderAll() {
    renderList();
    renderBody();
    refreshSaveState();
  }

  const unsub = sillytavernStore.subscribe(renderList);
  function cleanup() { unsub(); }

  renderAll();
  return { close };
}
