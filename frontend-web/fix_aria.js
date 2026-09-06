const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');
content = content.replace(/aria-label=\{text\.common\?\.back \|\| "Back"\}/, 'aria-label="Back"');
fs.writeFileSync('src/app/page.tsx', content);
