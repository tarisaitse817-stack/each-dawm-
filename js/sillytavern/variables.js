/**
 * Variable System Utilities (vanilla JS port，v2 范围)
 */

export function extractVariables(text) {
  const updates = {};
  const regex = /<var\s+name="([^"]+)"\s+value="([^"]+)"\s*\/?>/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const [, name, rawValue] = match;
    const num = Number(rawValue);
    updates[name] = Number.isNaN(num) ? rawValue : num;
  }
  const cleanedText = text.replace(regex, '').replace(/\n{2,}/g, '\n').trim();
  return { cleanedText, updates };
}

export function mergeVariables(base = {}, updates = {}) {
  return { ...base, ...updates };
}

export function formatVariablesForPrompt(variables) {
  const entries = Object.entries(variables);
  if (entries.length === 0) return '';
  const lines = entries.map(([k, v]) => `${k}: ${v}`);
  return `[当前状态]\n${lines.join('\n')}`;
}

export const USER_ROLE = 'user';

/** 在指定消息下标处截断会话，并从最后保留的消息（或提供的快照）恢复变量 */
export function truncateChatAt(chat, index, variables) {
  const truncated = chat.messages.slice(0, index);
  const restoredVars = variables ?? truncated[truncated.length - 1]?.variables ?? {};
  return { ...chat, messages: truncated, variables: restoredVars, updatedAt: Date.now() };
}

/** 从指定消息下标（含）创建分支会话 */
export function branchChat(source, index, options) {
  return {
    id: crypto.randomUUID(),
    name: options.name,
    messages: source.messages.slice(0, index + 1).map((m) => ({ ...m })),
    characterName: source.characterName,
    userName: source.userName,
    presetId: options.presetId,
    lorebookIds: [...options.lorebookIds],
    variables: options.variables ?? source.messages[index].variables ?? {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
