const fs = require('fs');
let content = fs.readFileSync('src/components/MenuAnalyzer.tsx', 'utf8');

// Replace Image with ImageIcon
content = content.replace(/import \{ Camera, FileUp, Image, /g, 'import { Camera, FileUp, ImageIcon, ');
content = content.replace(/<Image className="mr-2 h-5 w-5" \/>/g, '<ImageIcon className="mr-2 h-5 w-5" />');

fs.writeFileSync('src/components/MenuAnalyzer.tsx', content);
