import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const output = path.resolve("out");
const contentRoutes = {
  "": 400,
  "how-it-works": 400,
  "menu-translation-guide": 300,
  "supported-languages": 300,
  about: 300,
  contact: 275,
};
const noIndexRoutes = ["login", "history", "cart", "settings", "account-deletion"];

function htmlFor(route) {
  return fs.readFileSync(path.join(output, route, "index.html"), "utf8");
}

function visibleWordCount(html) {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z]+;/gi, " ");
  return text.match(/[\p{L}\p{N}]+/gu)?.length || 0;
}

for (const [route, minimumWords] of Object.entries(contentRoutes)) {
  const html = htmlFor(route);
  assert.ok(visibleWordCount(html) >= minimumWords, `${route || "/"} publisher content became too thin`);
  assert.ok(html.includes("google-adsense-account"), `${route || "/"} lost AdSense ownership verification`);
  assert.ok(!/adsbygoogle|pagead2\.googlesyndication\.com/.test(html), `${route || "/"} requested ads during review`);
}

for (const route of noIndexRoutes) {
  const html = htmlFor(route);
  assert.ok(html.includes('name="robots" content="noindex'), `/${route} must remain noindex`);
  assert.ok(!/adsbygoogle|pagead2\.googlesyndication\.com/.test(html), `/${route} requested ads`);
}

assert.ok(fs.readFileSync(path.join(output, "robots.txt"), "utf8").includes("Sitemap: https://aimenu.us.kg/sitemap.xml"));
assert.ok(fs.readFileSync(path.join(output, "sitemap.xml"), "utf8").includes("https://aimenu.us.kg/how-it-works/"));
console.log("AdSense static-output checks passed.");
