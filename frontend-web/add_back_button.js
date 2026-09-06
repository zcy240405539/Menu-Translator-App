const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

if (!content.includes('ArrowLeft')) {
  content = content.replace(/import \{ ([^\}]+) \} from "lucide-react";/, 'import { ArrowLeft, $1 } from "lucide-react";');
}

const oldTitle = /<CardTitle className="flex flex-col gap-2 text-2xl text-purple-950 sm:flex-row sm:items-center sm:justify-between">\s*<span>\{menuData\?\.business_name \|\| text\.result\.restaurantMenu\}<\/span>/;
const newTitle = `<CardTitle className="flex flex-col gap-2 text-2xl text-purple-950 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={handleHomeClick} 
                          className="rounded-full p-1.5 hover:bg-purple-200/50 transition-colors" 
                          aria-label={text.common?.back || "Back"}
                        >
                          <ArrowLeft className="h-6 w-6 text-purple-700" />
                        </button>
                        <span>{menuData?.business_name || text.result.restaurantMenu}</span>
                      </div>`;

content = content.replace(oldTitle, newTitle);

fs.writeFileSync('src/app/page.tsx', content);
