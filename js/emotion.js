// 情感标签 → 8 表情 key 的映射与归一化
import { EMOTION_LIST } from './scenes-data.js?v=26';

const ALIASES = {
  blush: 'blushing', blushing: 'blushing', embarrassed: 'blushing', shy: 'blushing',
  cry: 'sad', tears: 'sad', sad: 'sad', sorrow: 'sad',
  shock: 'surprised', shocked: 'surprised', surprised: 'surprised',
  happy: 'happy', laugh: 'happy', joy: 'happy', excited: 'happy',
  smile: 'smile', grin: 'smile',
  angry: 'angry', mad: 'angry', furious: 'angry',
  desire: 'desire', lust: 'desire', aroused: 'desire',
  neutral: 'neutral', normal: 'neutral',
};

export function mapEmotion(tag) {
  if (!tag) return 'neutral';
  const key = ALIASES[String(tag).toLowerCase().trim()];
  return key || 'neutral';
}
