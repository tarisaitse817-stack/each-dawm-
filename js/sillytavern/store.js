/**
 * SillyTavern vanilla store（skill 文档 vanilla/sillytavern-store.ts 的 JS ESM 移植）
 * 单例 + subscribe 订阅模式，供 UI 模块使用。
 */

import {
  getLorebooks, saveLorebook, deleteLorebook,
  getPresets, savePreset, deletePreset,
  getSettings, saveSettings, initializeDatabase,
  getChats, saveChat, deleteChat as deleteChatById,
  assemblePrompt, extractVariables, mergeVariables, USER_ROLE, truncateChatAt, branchChat,
} from './index.js?v=48';

export function createSillytavernStore() {
  let lorebooks = [];
  let presets = [];
  let settings = null;
  let activeLorebookIds = [];
  let chats = [];
  let activeChatId = null;
  let isSending = false;
  let isLoading = true;
  const listeners = new Set();

  const notify = () => listeners.forEach((cb) => cb());

  const loadAll = async () => {
    isLoading = true;
    notify();
    await initializeDatabase();
    const [l, p, s, c] = await Promise.all([getLorebooks(), getPresets(), getSettings(), getChats()]);
    lorebooks = l;
    presets = p;
    settings = s || null;
    activeLorebookIds = s?.activeLorebookIds || [];
    chats = c;
    isLoading = false;
    notify();
  };

  const toggleLorebook = async (id) => {
    const newIds = activeLorebookIds.includes(id)
      ? activeLorebookIds.filter((i) => i !== id)
      : [...activeLorebookIds, id];
    activeLorebookIds = newIds;
    if (settings) {
      const newSettings = { ...settings, activeLorebookIds: newIds };
      await saveSettings(newSettings);
      settings = newSettings;
    }
    notify();
  };

  const updateSettings = async (updates) => {
    if (!settings) return;
    const newSettings = { ...settings, ...updates };
    await saveSettings(newSettings);
    settings = newSettings;
    notify();
  };

  const createChat = async (name) => {
    if (!settings) throw new Error('Settings not loaded');
    const chatCount = chats.filter((c) => c.characterName === settings.characterName).length;
    const chatName = name || `${settings.characterName} - 新对话 ${chatCount + 1}`;
    const newChat = {
      id: crypto.randomUUID(),
      name: chatName,
      messages: [],
      characterName: settings.characterName,
      userName: settings.userName,
      presetId: settings.activePresetId || presets[0]?.id || null,
      lorebookIds: [...activeLorebookIds],
      variables: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveChat(newChat);
    chats = [...chats, newChat];
    activeChatId = newChat.id;
    notify();
    return newChat.id;
  };

  const loadChat = (id) => {
    if (activeChatId === id) return;
    activeChatId = id;
    notify();
  };

  const deleteChat = async (id) => {
    await deleteChatById(id);
    chats = chats.filter((c) => c.id !== id);
    if (activeChatId === id) activeChatId = null;
    notify();
  };

  const updateVariables = async (updates) => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat) return;
    const merged = mergeVariables(activeChat.variables, updates);
    const updatedChat = { ...activeChat, variables: merged, updatedAt: Date.now() };
    await saveChat(updatedChat);
    chats = chats.map((c) => (c.id === updatedChat.id ? updatedChat : c));
    notify();
  };

  const sendMessage = async (content) => {
    if (!settings || !activeChatId) throw new Error('No active chat or settings not loaded');
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat) throw new Error('Active chat not found');

    isSending = true;
    notify();

    try {
      const activePreset = presets.find((p) => p.id === settings.activePresetId) || presets[0];
      if (!activePreset) throw new Error('No preset available');

      const activeBooks = lorebooks.filter((b) => activeLorebookIds.includes(b.id));
      const currentVariables = activeChat.variables || {};

      const userMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
        variables: { ...currentVariables },
      };

      const updatedMessages = [...activeChat.messages, userMessage];
      let updatedChat = { ...activeChat, messages: updatedMessages, updatedAt: Date.now() };

      const { messages: promptMessages } = assemblePrompt({
        userInput: content,
        history: updatedMessages,
        preset: activePreset,
        lorebooks: activeBooks,
        userName: settings.userName,
        characterName: settings.characterName,
        variables: currentVariables,
      });

      const requestBody = {
        model: activePreset.settings.openai_model || settings.api.model,
        messages: promptMessages,
      };
      if (activePreset.settings.temp_openai !== undefined) requestBody.temperature = activePreset.settings.temp_openai;
      if (activePreset.settings.openai_max_tokens !== undefined) requestBody.max_tokens = activePreset.settings.openai_max_tokens;
      if (activePreset.settings.top_p_openai !== undefined) requestBody.top_p = activePreset.settings.top_p_openai;
      if (activePreset.settings.freq_pen_openai !== undefined) requestBody.frequency_penalty = activePreset.settings.freq_pen_openai;
      if (activePreset.settings.pres_pen_openai !== undefined) requestBody.presence_penalty = activePreset.settings.pres_pen_openai;
      if (activePreset.settings.stream_openai !== undefined) requestBody.stream = activePreset.settings.stream_openai;

      // 超时控制（settings.api.timeout，默认 60s）
      const timeoutMs = settings.api.timeout || 60000;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      let response;
      try {
        response = await fetch(settings.api.baseUrl.replace(/\/+$/, '') + '/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${settings.api.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      if (requestBody.stream) {
        // v2 简化处理：流式响应按非流式读取（收集后一次性解析）
        const text = await response.text();
        const lines = text.split('\n').filter((l) => l.startsWith('data: ') && !l.includes('[DONE]'));
        const deltas = lines.map((l) => {
          try { return JSON.parse(l.slice(6)).choices?.[0]?.delta?.content || ''; } catch { return ''; }
        });
        const rawReply = deltas.join('');
        const { cleanedText: reply, updates: extractedVars } = extractVariables(rawReply);
        const nextVariables = mergeVariables(currentVariables, extractedVars);

        const assistantMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: reply,
          timestamp: Date.now(),
          variables: { ...nextVariables },
        };

        updatedChat = { ...updatedChat, messages: [...updatedChat.messages, assistantMessage], variables: nextVariables };
        await saveChat(updatedChat);
        chats = chats.map((c) => (c.id === updatedChat.id ? updatedChat : c));
        return { reply, variables: nextVariables };
      }

      const data = await response.json();
      const rawReply = data.choices?.[0]?.message?.content || '';
      const { cleanedText: reply, updates: extractedVars } = extractVariables(rawReply);
      const nextVariables = mergeVariables(currentVariables, extractedVars);

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: reply,
        timestamp: Date.now(),
        variables: { ...nextVariables },
      };

      updatedChat = { ...updatedChat, messages: [...updatedChat.messages, assistantMessage], variables: nextVariables };
      await saveChat(updatedChat);
      chats = chats.map((c) => (c.id === updatedChat.id ? updatedChat : c));
      return { reply, variables: nextVariables };
    } finally {
      isSending = false;
      notify();
    }
  };

  const editMessage = async (messageId, newContent) => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat) return;
    const idx = activeChat.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;
    if (activeChat.messages[idx].role !== USER_ROLE) return;

    const updatedChat = truncateChatAt(activeChat, idx, activeChat.messages[idx].variables);
    await saveChat(updatedChat);
    chats = chats.map((c) => (c.id === updatedChat.id ? updatedChat : c));
    notify();
    await sendMessage(newContent);
  };

  const deleteMessagesFrom = async (messageId) => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat) return;
    const idx = activeChat.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) return;

    const updatedChat = truncateChatAt(activeChat, idx);
    await saveChat(updatedChat);
    chats = chats.map((c) => (c.id === updatedChat.id ? updatedChat : c));
    notify();
  };

  const branchFromMessage = async (messageId, name) => {
    const activeChat = chats.find((c) => c.id === activeChatId);
    if (!activeChat || !settings) throw new Error('No active chat');
    const idx = activeChat.messages.findIndex((m) => m.id === messageId);
    if (idx === -1) throw new Error('Message not found');

    const branchCount = chats.filter((c) => c.characterName === settings.characterName).length;
    const branchName = name || `${settings.characterName} - 分支 ${branchCount + 1}`;
    const newChat = branchChat(activeChat, idx, {
      name: branchName,
      presetId: settings.activePresetId || presets[0]?.id || null,
      lorebookIds: [...activeLorebookIds],
      variables: activeChat.messages[idx].variables,
    });
    await saveChat(newChat);
    chats = [...chats, newChat];
    activeChatId = newChat.id;
    notify();
    return newChat.id;
  };

  const subscribe = (cb) => {
    listeners.add(cb);
    return () => listeners.delete(cb);
  };

  return {
    get lorebooks() { return lorebooks; },
    get presets() { return presets; },
    get settings() { return settings; },
    get activeLorebookIds() { return activeLorebookIds; },
    get chats() { return chats; },
    get activeChatId() { return activeChatId; },
    get activeChat() { return chats.find((c) => c.id === activeChatId) || null; },
    get isSending() { return isSending; },
    get isLoading() { return isLoading; },
    loadAll,
    toggleLorebook,
    updateSettings,
    createChat,
    loadChat,
    deleteChat,
    sendMessage,
    updateVariables,
    editMessage,
    deleteMessagesFrom,
    branchFromMessage,
    saveLorebook,
    deleteLorebook,
    savePreset,
    deletePreset,
    subscribe,
  };
}

export const sillytavernStore = createSillytavernStore();
