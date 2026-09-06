const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // English
  content = content.replace(/"AI Smart Recommendation"/g, '"AI Recommend"');

  // Chinese
  content = content.replace(/AI 智能推荐/g, 'AI 推荐');
  content = content.replace(/智能推荐/g, 'AI推荐');

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
