const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');

const oldSteps = /<div className="grid max-w-md grid-cols-2 gap-2 sm:gap-4">[\s\S]*?\{text\.home\.steps\.map\(\(label, index\) => \([\s\S]*?<\/div>\s*\)\)\}\s*<\/div>/;

const newSteps = `<div className="grid max-w-md grid-cols-2 gap-2 sm:gap-4">
                      {text.home.steps.map((label, index) => {
                        const styles = [
                          { color: "text-[#EA4335]", border: "border-t-[#EA4335]" },
                          { color: "text-[#333333]", border: "border-t-[#333333]" },
                          { color: "text-[#9E9E9E]", border: "border-t-[#9E9E9E]" },
                          { color: "text-[#FBBC05]", border: "border-t-[#FBBC05]" },
                        ][index % 4];
                        return (
                          <div key={label} className={\`flex min-h-16 min-w-0 flex-col items-start gap-1 border-t-4 bg-transparent px-2 py-4 shadow-none \${styles.border}\`}>
                            <span className={\`font-mono text-lg font-extrabold \${styles.color}\`}>{String(index + 1).padStart(2, "0")}</span>
                            <span className="min-w-0 whitespace-normal text-sm font-bold leading-snug text-gray-900 sm:text-base mt-1">{label}</span>
                          </div>
                        );
                      })}
                    </div>`;

content = content.replace(oldSteps, newSteps);
fs.writeFileSync('src/app/page.tsx', content);
