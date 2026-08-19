/**
 * 光之回响 AI 客户端 + MDPro3 对战桥接
 */
import { AppState } from './state.js?v=31';
import { getPresent, getActivity } from './schedules.js?v=31';
import { getScene } from './scenes-data.js?v=31';

export const AiClient = {
    endpoint: 'http://127.0.0.1:9999',

    async chat(input) {
        const state = AppState.get();
        const settings = state.settings || {};

        const body = {
            input,
            history: (state.narrativeHistory || []).slice(-40),
            game_state: {
                player: state.player,
                gamePhase: state.gamePhase,
                companions: state.companions,
                inventory: state.inventory,
                currentSceneId: state.currentSceneId,
                gameTime: state.gameTime,
                currentSceneName: (getScene(state.currentSceneId) || {}).name || '',
                sceneCharacters: getPresent(state.currentSceneId, state.gameTime).map(function (p) {
                    return { name: (getActivity(p.charId, state.gameTime) || '').split(' · ')[0], activity: p.activity };
                })
            },
            api_key: settings.aiApiKey || '',
            endpoint: settings.aiEndpoint || '',
            model: settings.aiModel || ''
        };

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 200000); // 200s timeout

        try {
            const resp = await fetch(`${this.endpoint}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: controller.signal
            });
            clearTimeout(timer);

            const data = await resp.json();
            if (!data.ok) {
                throw new Error(data.message || data.error || 'AI 调用失败');
            }
            const result = {
                narrative: data.narrative || '',
                battle: !!data.battle,
                thinking: data.thinking || '',
                usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
                emotion: data.emotion
            };
            // 表情透传：bridge 无 emotion 字段时补 null（兼容旧 bridge）
            if (result && typeof result.emotion === 'undefined') result.emotion = null;
            return result;
        } catch (err) {
            clearTimeout(timer);
            if (err.name === 'AbortError') {
                throw new Error('AI 响应超时，请重试');
            }
            if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                throw new Error('bridge_offline');
            }
            throw err;
        }
    },

    async health() {
        try {
            const resp = await fetch(`${this.endpoint}/health`);
            const data = await resp.json();
            return data;
        } catch {
            return { ok: false, error: 'bridge_offline' };
        }
    }
};

export const BattleBridge = {
    _pollTimer: null,

    async launch(deck, opponent) {
        try {
            const resp = await fetch(`${AiClient.endpoint}/battle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deck: deck, opponent: opponent || null })
            });
            const data = await resp.json();
            return data;
        } catch (err) {
            return { ok: false, error: 'bridge_offline', message: '桥接服务器未运行' };
        }
    },

    getDeckName() {
        const state = AppState.get();
        return state.settings.mdpro3Deck || 'PlayerInsect';
    },

    startPolling(onResult) {
        var self = this;
        this.stopPolling();
        var count = 0;
        console.log('[BattleBridge] Polling started');
        this._pollTimer = setInterval(async function () {
            count++;
            if (count > 600) { console.log('[BattleBridge] Poll timeout'); self.stopPolling(); return; }
            try {
                var resp = await fetch(AiClient.endpoint + '/duel-status');
                var data = await resp.json();
                if (count % 3 === 0) console.log('[BattleBridge] Poll #' + count + ': running=' + data.battle_running + ' result=' + (data.result ? 'YES' : 'no'));
                if (data.ok && data.result) {
                    console.log('[BattleBridge] GOT RESULT!', data.result);
                    self.stopPolling();
                    if (onResult) onResult(data.result);
                } else if (!data.battle_running && count > 10) {
                    self.stopPolling();
                }
            } catch (e) { console.log('[BattleBridge] poll:', e.message); }
        }, 2000);
    },

    stopPolling() {
        if (this._pollTimer) { clearInterval(this._pollTimer); this._pollTimer = null; }
    }
};
