import assert from "node:assert/strict";
import { shouldLoadAdsense } from "../src/lib/adsense.ts";

const emptySearch = new URLSearchParams();
const client = "ca-pub-test";

for (const route of ["/", "/how-it-works/", "/menu-translation-guide", "/menu-examples", "/supported-languages"]) {
  assert.equal(shouldLoadAdsense(route, emptySearch, true, client), true, `${route} should allow ads after approval`);
}

for (const route of ["/about", "/contact", "/download", "/login", "/history", "/cart", "/settings", "/privacy-policy", "/terms-of-service", "/account-deletion"]) {
  assert.equal(shouldLoadAdsense(route, emptySearch, true, client), false, `${route} must never load ads`);
}

assert.equal(shouldLoadAdsense("/", new URLSearchParams("menu_hash=test"), true, client), false);
assert.equal(shouldLoadAdsense("/", new URLSearchParams("show_recommend=1"), true, client), false);
assert.equal(shouldLoadAdsense("/menu-examples", emptySearch, false, client), false);
assert.equal(shouldLoadAdsense("/menu-examples", emptySearch, true, ""), false);

console.log("AdSense route-gating checks passed.");
