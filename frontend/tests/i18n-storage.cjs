// Run: node tests/i18n-storage.cjs. Storage interfaces are mocked.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

const filename = path.join(__dirname, "..", "i18n.js");
const { code } = babel.transformSync(fs.readFileSync(filename, "utf8"), {
  filename,
  configFile: false,
  babelrc: false,
  plugins: ["@babel/plugin-transform-modules-commonjs"],
});

function load({ localStorage } = {}) {
  const nativeValues = new Map();
  const exportsObject = {};
  const context = {
    exports: exportsObject,
    console,
    require: (name) => {
      if (name === "@react-native-async-storage/async-storage") {
        return {
          getItem: async (key) => nativeValues.get(key) || null,
          setItem: async (key, value) => nativeValues.set(key, value),
        };
      }
      if (name.startsWith("./locales/")) return { languageNames: {} };
      throw new Error(`Missing mock: ${name}`);
    },
  };
  if (localStorage) context.localStorage = localStorage;
  vm.runInNewContext(code, context, { filename });
  return { i18n: exportsObject, nativeValues };
}

(async () => {
  const native = load();
  await native.i18n.saveLanguage("zh-CN");
  assert.equal(native.nativeValues.get("menu_app_language"), "zh");
  assert.equal(await native.i18n.getSavedLanguage(), "zh");

  const webValues = new Map();
  const web = load({
    localStorage: {
      getItem: (key) => webValues.get(key) || null,
      setItem: (key, value) => webValues.set(key, value),
    },
  });
  await web.i18n.saveLanguage("zh-Hant");
  assert.equal(webValues.get("menu_app_language"), "zh-Hant");
  assert.equal(await web.i18n.getSavedLanguage(), "zh-Hant");
  console.log("Language preference persists on native and web storage");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
