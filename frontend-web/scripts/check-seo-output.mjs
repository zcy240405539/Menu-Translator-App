import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const output = path.resolve("out");
const languages = ["zh-cn", "zh-hant", "es", "fr", "ja", "ko", "ru", "pt", "de", "it", "ar"];
const contentRoutes = [
  "how-it-works",
  "menu-translation-guide",
  "menu-examples",
  "supported-languages",
  "about",
  "contact",
];

function htmlFor(...segments) {
  return fs.readFileSync(path.join(output, ...segments, "index.html"), "utf8");
}

const home = htmlFor();
assert.ok(!home.includes("?lang=en"), "English homepage links must not create query duplicates");
assert.ok(!home.includes("/login&next="), "English login links must use a valid query string");
assert.ok(home.includes("/login/?next="), "English login link lost its return destination");
assert.match(home, /hrefLang="x-default" href="https:\/\/aimenu\.us\.kg\/"/i, "Homepage lost x-default hreflang");
assert.match(home, /hrefLang="zh-Hans" href="https:\/\/aimenu\.us\.kg\/zh-cn\/"/i, "Homepage lost Simplified Chinese hreflang");

for (const language of languages) {
  const localizedHome = htmlFor(language);
  assert.ok(localizedHome.includes(`https://aimenu.us.kg/${language}/`), `${language} homepage lost its canonical URL`);
  for (const route of contentRoutes) {
    const localizedPage = htmlFor(language, route);
    assert.ok(localizedPage.includes(`https://aimenu.us.kg/${language}/${route}/`), `${language}/${route} lost its canonical URL`);
    assert.match(localizedPage, /hrefLang="x-default"/i, `${language}/${route} lost x-default hreflang`);
  }
}

const oldPrivacy = htmlFor("home", "privacy-policy");
assert.ok(oldPrivacy.includes('name="robots" content="noindex, follow"'), "Old privacy route must remain out of the index");
assert.ok(oldPrivacy.includes('href="https://aimenu.us.kg/privacy-policy/"'), "Old privacy route must canonicalize to the current policy");

const sitemap = fs.readFileSync(path.join(output, "sitemap.xml"), "utf8");
assert.equal((sitemap.match(/<url>/g) || []).length, 86, "Sitemap must list every canonical localized page plus legal pages");
assert.ok(sitemap.includes("<lastmod>2026-09-24T00:00:00.000Z</lastmod>"), "Sitemap lost its verified content revision date");
assert.ok(!sitemap.includes("<changefreq>"), "Google-ignored changefreq values must stay out of the sitemap");
assert.ok(!sitemap.includes("<priority>"), "Google-ignored priority values must stay out of the sitemap");

console.log("Localized SEO output checks passed.");
