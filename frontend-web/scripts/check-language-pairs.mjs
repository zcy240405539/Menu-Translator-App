import assert from "node:assert/strict";
import {
  selectSourceLanguage,
  selectTargetLanguage,
} from "../src/lib/languagePair.ts";

assert.deepEqual(selectSourceLanguage("auto", "es", "es"), { source: "es", target: "en" });
assert.deepEqual(selectSourceLanguage("auto", "en", "en"), { source: "en", target: "es" });
assert.deepEqual(selectSourceLanguage("en", "es", "es"), { source: "es", target: "en" });
assert.deepEqual(selectTargetLanguage("es", "en", "es"), { source: "en", target: "es" });
assert.deepEqual(selectTargetLanguage("en", "es", "en"), { source: "es", target: "en" });

for (const language of ["zh-cn", "zh-Hant", "es", "fr", "ja", "ko", "ru", "pt", "de", "it", "ar"]) {
  assert.deepEqual(selectSourceLanguage("auto", language, language), { source: language, target: "en" });
  assert.deepEqual(selectTargetLanguage(language, "en", language), { source: "en", target: language });
}

console.log("Language pair checks passed.");
