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
  "privacy-policy": 300,
  "terms-of-service": 300,
};
const noIndexRoutes = ["login", "register", "history", "cart", "settings", "account-deletion", "download", "ad-frame"];

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
  assert.ok(html.includes('rel="canonical"'), `${route || "/"} lost its canonical URL`);
  assert.ok(html.includes("application/ld+json"), `${route || "/"} lost structured data`);
  assert.ok(!html.includes("<article"), `${route || "/"} must use the shared content-page layout`);
  assert.ok(!/google-adsense-account|adsbygoogle|pagead2\.googlesyndication\.com/.test(html), `${route || "/"} still contains AdSense`);
}

const home = htmlFor("");
assert.ok(home.includes("adsterra-slot"), "homepage lost the Adsterra slot");
assert.ok(home.includes("document.write"), "Adsterra must load during HTML parsing");
assert.ok(home.includes("IntersectionObserver"), "Adsterra must stop before the footer");
assert.ok(home.includes("MutationObserver"), "Adsterra must wait for a real creative before becoming visible");
assert.ok(home.includes("data-site-footer"), "footer lost its Adsterra visibility marker");
assert.ok(!/srcdoc=|srcDoc=/.test(home), "Adsterra must not run inside a srcDoc iframe");

const dialogsSource = fs.readFileSync(path.resolve("src/components/MenuResultDialogs.tsx"), "utf8");
assert.equal(dialogsSource.match(/<InlineAdsterraAd\s*\/>/g)?.length, 3, "detail, recommendation, and recommendation-item cards need inline ads");
const inlineAdSource = fs.readFileSync(path.resolve("src/components/InlineAdsterraAd.tsx"), "utf8");
assert.ok(inlineAdSource.includes("adsterra-ready"), "inline ads must wait for a real creative");
assert.ok(inlineAdSource.includes('src="/ad-frame/"'), "inline ads must use the same-origin ad frame");
assert.ok(!inlineAdSource.includes("allow-same-origin"), "the ad frame must remain isolated from the parent document");
assert.ok(!inlineAdSource.includes("srcDoc"), "inline ads must not use an anonymous srcDoc frame");

const adFrame = htmlFor("ad-frame");
assert.ok(adFrame.includes("adsterra-ready"), "the ad frame must notify its parent after a creative loads");
assert.ok(adFrame.includes("document.write"), "the ad frame must load Adsterra during HTML parsing");
const login = htmlFor("login");
const register = htmlFor("register");
assert.ok(login.includes("google-g-logo.svg"), "login must show the Google G logo");
assert.ok(register.includes("google-g-logo.svg"), "registration must show the Google G logo");

for (const route of noIndexRoutes) {
  const html = htmlFor(route);
  assert.ok(html.includes('name="robots" content="noindex'), `/${route} must remain noindex`);
  assert.ok(!/google-adsense-account|adsbygoogle|pagead2\.googlesyndication\.com/.test(html), `/${route} still contains AdSense`);
}

const adsTxtPath = path.join(output, "ads.txt");
if (fs.existsSync(adsTxtPath)) {
  assert.ok(!fs.readFileSync(adsTxtPath, "utf8").includes("pub-8286400764174465"), "AdSense ads.txt entry must not be published");
}
assert.ok(fs.readFileSync(path.join(output, "robots.txt"), "utf8").includes("Sitemap: https://aimenu.us.kg/sitemap.xml"));
const sitemap = fs.readFileSync(path.join(output, "sitemap.xml"), "utf8");
assert.ok(sitemap.includes("https://aimenu.us.kg/how-it-works/"));
assert.ok(sitemap.includes("https://aimenu.us.kg/menu-examples/"));
assert.ok(!sitemap.includes("https://aimenu.us.kg/download/"));
console.log("Adsterra static-output checks passed.");
