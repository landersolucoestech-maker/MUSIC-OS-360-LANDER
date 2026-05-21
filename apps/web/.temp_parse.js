const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, 'src', 'components', 'scheduler', 'SchedulerListView.tsx');
const text = fs.readFileSync(p, 'utf8');
const lines = text.split(/\r?\n/);
const total = lines.length;
for (let i = 0; i < total; i++) {
  const line = lines[i];
  if (/\b<div\b/.test(line) || /<\/div>/.test(line)) {
    console.log(`${i + 1}: ${line}`);
  }
}
const open = (text.match(/<div\b/g) || []).length;
const close = (text.match(/<\/div>/g) || []).length;
console.log('open=' + open + ' close=' + close);