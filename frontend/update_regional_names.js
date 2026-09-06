const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'locales');

const updates = [
  { file: 'zh-Hant.json', from: /AI菜单通/g, to: 'AI菜單通' },
  { file: 'ja.json', from: /AI MenuLens/g, to: 'AIメニュー通' },
  { file: 'ko.json', from: /AI MenuLens/g, to: 'AI메뉴통' },
  { file: 'es.json', from: /AI MenuLens/g, to: 'AI MenúLens' },
];

for (const update of updates) {
  const filePath = path.join(localesDir, update.file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    content = content.replace(update.from, update.to);
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${update.file}`);
  } else {
    console.log(`File not found: ${update.file}`);
  }
}
