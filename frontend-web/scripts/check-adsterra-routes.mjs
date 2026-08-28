import assert from "node:assert/strict";
import { shouldLoadAdsterra } from "../src/lib/adsterra.ts";

const emptySearch = new URLSearchParams();

for (const route of ["/", "/how-it-works/", "/menu-translation-guide", "/menu-examples", "/supported-languages"]) {
  assert.equal(shouldLoadAdsterra(route, emptySearch, true, true), true, `${route} should allow ads`);
}

for (const route of ["/about", "/contact", "/download", "/login", "/history", "/cart", "/settings", "/privacy-policy", "/terms-of-service", "/account-deletion"]) {
  assert.equal(shouldLoadAdsterra(route, emptySearch, true, true), false, `${route} must never load ads`);
}

assert.equal(shouldLoadAdsterra("/", new URLSearchParams("menu_hash=test"), true, true), false);
assert.equal(shouldLoadAdsterra("/", new URLSearchParams("show_recommend=1"), true, true), false);
assert.equal(shouldLoadAdsterra("/menu-examples", emptySearch, false, true), false);
assert.equal(shouldLoadAdsterra("/menu-examples", emptySearch, true, false), false);

console.log("Adsterra route-gating checks passed.");
