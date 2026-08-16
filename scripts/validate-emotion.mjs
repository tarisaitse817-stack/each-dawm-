// node scripts/validate-emotion.mjs
import { mapEmotion } from '../js/emotion.js';
import { EMOTION_LIST } from '../js/scenes-data.js';
const cases = {
  neutral: 'neutral', blush: 'blushing', embarrassed: 'blushing', shy: 'blushing',
  cry: 'sad', tears: 'sad', shock: 'surprised', happy: 'happy', laugh: 'happy',
  smile: 'smile', angry: 'angry', mad: 'angry', desire: 'desire', lust: 'desire',
  '': 'neutral', null: 'neutral', undefined: 'neutral', '啥也不是': 'neutral', 'HAPPY': 'happy',
};
let errors = [];
for (const [input, want] of Object.entries(cases)) {
  const got = mapEmotion(input);
  if (got !== want) errors.push(`mapEmotion(${JSON.stringify(input)}) = ${got}, 期望 ${want}`);
}
for (const e of EMOTION_LIST) {
  if (!EMOTION_LIST.includes(mapEmotion(e))) errors.push(`${e} 映射越界`);
}
if (errors.length) { console.error('FAIL'); errors.forEach(e => console.error(' -', e)); process.exit(1); }
console.log('PASS: 情感标签映射全部正确');
