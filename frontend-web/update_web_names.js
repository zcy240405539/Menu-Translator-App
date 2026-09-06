const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'src', 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // English/Global
  content = content.replace(/AI Menu APP/g, 'AI MenuLens');
  content = content.replace(/AI Menu App/g, 'AI MenuLens');

  // Chinese
  content = content.replace(/AI点菜通/g, 'AI菜单通');
  content = content.replace(/AI 点菜通/g, 'AI 菜单通');

  if (file === 'zh-Hant.json') {
    content = content.replace(/AI菜单通/g, 'AI菜單通');
    content = content.replace(/AI 菜单通/g, 'AI 菜單通');
  }

  if (file === 'ja.json') {
    content = content.replace(/AI MenuLens/g, 'AIメニュー通');
  }
  if (file === 'ko.json') {
    content = content.replace(/AI MenuLens/g, 'AI메뉴통');
  }
  if (file === 'es.json') {
    content = content.replace(/AI MenuLens/g, 'AI MenúLens');
  }

  fs.writeFileSync(filePath, content);
  console.log(`Updated ${file}`);
}
