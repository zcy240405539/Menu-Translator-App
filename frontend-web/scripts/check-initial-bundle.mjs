import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(root, "out");
const html = await readFile(path.join(outputRoot, "index.html"), "utf8");
const scriptPaths = [...new Set(
  [...html.matchAll(/\/_next\/static\/chunks\/[^"']+\.js/g)].map(([value]) => value)
)];

if (scriptPaths.length === 0) {
  throw new Error("No initial JavaScript chunks were found in out/index.html. Run npm run build first.");
}

const initialScripts = await Promise.all(scriptPaths.map(async (source) => {
  const filePath = path.join(outputRoot, ...source.split("/").filter(Boolean));
  return {
    source,
    contents: await readFile(filePath, "utf8"),
    bytes: (await stat(filePath)).size,
  };
}));

const localeCodes = ["ar", "de", "es", "fr", "it", "ja", "ko", "pt", "ru", "zh-cn", "zh-Hant"];
const bundledLocales = [];
for (const locale of localeCodes) {
  const catalog = JSON.parse(await readFile(path.join(root, "src", "locales", `${locale}.json`), "utf8"));
  const marker = catalog.home.titleLines[0];
  if (initialScripts.some(({ contents }) => contents.includes(marker))) bundledLocales.push(locale);
}

if (bundledLocales.length > 0) {
  throw new Error(`Non-English catalogs were bundled into the initial page scripts: ${bundledLocales.join(", ")}`);
}

const totalBytes = initialScripts.reduce((total, script) => total + script.bytes, 0);
const maxInitialBytes = 850_000;
if (totalBytes > maxInitialBytes) {
  throw new Error(`Initial JavaScript is ${totalBytes} bytes, above the ${maxInitialBytes}-byte regression limit.`);
}

console.log(`Initial bundle checks passed: ${scriptPaths.length} scripts, ${totalBytes} bytes, non-English catalogs lazy-loaded.`);
