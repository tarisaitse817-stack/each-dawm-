const fs = require('fs');
const wb = JSON.parse(fs.readFileSync('C:/Users/Administrator/each-dawm-/data/worldbook.json', 'utf-8'));
const raw = wb.first_mes || '';

// Step 1: strip <maintext> tags
let step1 = raw.replace(/<\/?maintext>/g, '');

// Step 2: replace literal \n with actual newline
// In the string, \n is literal backslash+n (2 chars)
const LITERAL_BSLASH_N = '\\n';  // in JS string, this is backslash + n (2 chars)
let step2 = step1.split(LITERAL_BSLASH_N).join('\n');

console.log('After step1 (strip tags):', step1.substring(0, 80));
console.log('');
console.log('Has literal backslash-n after step1:', step1.includes('\\n'));
console.log('');

// Step 3: split into paragraphs
const paragraphs = step2.split(/\n\n+/).filter(p => p.trim().length > 50);
console.log('Paragraphs found:', paragraphs.length);
paragraphs.forEach((p, i) => {
    console.log(`[${i}] len=${p.length}`);
    console.log(p.substring(0, 100).replace(/\n/g, '↵'));
    console.log('...');
});
