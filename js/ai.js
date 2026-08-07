/**
 * 光之回响 AI 客户端 + MDPro3 对战桥接
 */
export const AiClient = {
    endpoint: 'http://localhost:9999',

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
                mapNodes: state.mapNodes
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
            return {
                narrative: data.narrative || '',
                battle: !!data.battle,
                thinking: data.thinking || '',
                usage: data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
            };
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
    async launch(deck) {
        try {
            const resp = await fetch(`${AiClient.endpoint}/battle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deck })
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
    }
};
