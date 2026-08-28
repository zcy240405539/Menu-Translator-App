import assert from "node:assert/strict";
import { shouldLoadAdsterra } from "../src/lib/adsterra.ts";

for (const route of ["/", "/how-it-works/", "/menu-translation-guide", "/menu-examples", "/supported-languages", "/about", "/contact", "/privacy-policy", "/terms-of-service", "/login", "/register", "/settings"]) {
  assert.equal(shouldLoadAdsterra(route, true, true), true, `${route} should allow ads`);
}

for (const route of ["/download", "/history", "/cart", "/account-deletion", "/ad-frame"]) {
  assert.equal(shouldLoadAdsterra(route, true, true), false, `${route} must never load ads`);
}

assert.equal(shouldLoadAdsterra("/menu-examples", false, true), false);
assert.equal(shouldLoadAdsterra("/menu-examples", true, false), false);

console.log("Adsterra route-gating checks passed.");
