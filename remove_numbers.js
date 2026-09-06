const fs = require('fs');

// 1. Update App
let appContent = fs.readFileSync('frontend/screens/HomeScreen.js', 'utf8');
appContent = appContent.replace(/<Text style=\{\[styles\.featureNumber, \{ color: item\.color \}\]\}>\s*\{String\(index \+ 1\)\.padStart\(2, "0"\)\}\s*<\/Text>\s*/, '');
fs.writeFileSync('frontend/screens/HomeScreen.js', appContent);

// 2. Update Web
let webContent = fs.readFileSync('frontend-web/src/app/page.tsx', 'utf8');
webContent = webContent.replace(/<span className=\{\`font-mono text-lg font-extrabold \$\{styles\.color\}\`\}>\{String\(index \+ 1\)\.padStart\(2, "0"\)\}<\/span>\s*/, '');
fs.writeFileSync('frontend-web/src/app/page.tsx', webContent);

console.log('Removed numbers from App and Web');
