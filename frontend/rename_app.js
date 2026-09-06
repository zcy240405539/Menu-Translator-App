const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, 'locales');
const files = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

for (const file of files) {
  const filePath = path.join(localesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace English/Global instances
  content = content.replace(/AI Menu APP/g, 'AI MenuLens');
  content = content.replace(/AI Menu App/g, 'AI MenuLens');

  // Replace Chinese instances
  content = content.replace(/AI点菜通/g, 'AI菜单通');
  content = content.replace(/AI 点菜通/g, 'AI 菜单通');

  fs.writeFileSync(filePath, content);
}

// Also update app.config.js if needed
const appConfigPath = path.join(__dirname, 'app.config.js');
if (fs.existsSync(appConfigPath)) {
  let content = fs.readFileSync(appConfigPath, 'utf8');
  content = content.replace(/AI Menu APP/g, 'AI MenuLens');
  content = content.replace(/AI Menu App/g, 'AI MenuLens');
  content = content.replace(/AI点菜通/g, 'AI菜单通');
  fs.writeFileSync(appConfigPath, content);
}

console.log("Replaced successfully!");
