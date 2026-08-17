import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const output = path.resolve("out");
const contentRoutes = {
  "": 400,
  "how-it-works": 400,
  "menu-translation-guide": 500,
  "menu-examples": 650,
  "supported-languages": 300,
  about: 300,
  contact: 275,
};
const noIndexRoutes = ["login", "history", "cart", "settings", "account-deletion", "download"];

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
  assert.ok(html.includes('rel="canonical"'), `${route || "/"} lost its canonical URL`);
  assert.ok(html.includes("application/ld+json"), `${route || "/"} lost structured data`);
  assert.ok(!/adsbygoogle|pagead2\.googlesyndication\.com/.test(html), `${route || "/"} requested ads during review`);
}

for (const route of noIndexRoutes) {
  const html = htmlFor(route);
  assert.ok(html.includes('name="robots" content="noindex'), `/${route} must remain noindex`);
  assert.ok(!/adsbygoogle|pagead2\.googlesyndication\.com/.test(html), `/${route} requested ads`);
}

assert.ok(fs.readFileSync(path.join(output, "robots.txt"), "utf8").includes("Sitemap: https://aimenu.us.kg/sitemap.xml"));
const sitemap = fs.readFileSync(path.join(output, "sitemap.xml"), "utf8");
assert.ok(sitemap.includes("https://aimenu.us.kg/how-it-works/"));
assert.ok(sitemap.includes("https://aimenu.us.kg/menu-examples/"));
assert.ok(!sitemap.includes("https://aimenu.us.kg/download/"));
console.log("AdSense static-output checks passed.");
