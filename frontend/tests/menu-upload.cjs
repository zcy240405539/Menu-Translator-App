// Run: node tests/menu-upload.cjs. Native interfaces are mocked; device tests are separate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

function load(file, mocks, globals = {}) {
  const filename = path.join(__dirname, '..', file);
  const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
    filename, configFile: false, babelrc: false,
    plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
  });
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, process: { env: {} }, setTimeout: fn => fn(), clearTimeout() {},
    require: name => { assert.ok(name in mocks, `Missing mock: ${name}`); return mocks[name]; },
    ...globals,
  }, { filename });
  return exports;
}

async function check(os) {
  const uploads = [];
  class FormDataMock {
    parts = [];
    append(...part) { this.parts.push(part); }
  }
  const api = load('api.js', {
    'react-native': { Platform: { OS: os } },
    'expo-file-system/legacy': {
      FileSystemUploadType: { MULTIPART: 1 },
      createUploadTask(url, uri, options) {
        assert.equal(typeof uri, 'string');
        uploads.push({ url, uri, options });
        return { uploadAsync: async () => ({ status: 200, body: '{"task_id":"test"}' }) };
      },
    },
  }, {
    FormData: FormDataMock,
    XMLHttpRequest: class {
      open(method, url) { assert.equal(method, 'POST'); this.url = url; }
      setRequestHeader(name) { assert.notEqual(name.toLowerCase(), 'content-type'); }
      send(form) {
        uploads.push(form.parts);
        this.status = 200;
        this.responseText = '{"task_id":"test"}';
        this.onload();
      }
    },
    fetch: async url => {
      assert.ok(url.endsWith('/menus/parse/status/test'));
      return { ok: true, json: async () => ({ status: 'done', result: { dishes: ['Soup'] } }) };
    },
  });
  const file = { uri: 'file:///menu.png', name: 'menu.png', mimeType: 'image/png' };
  for (const bad of [undefined, [], {}, [{ uri: undefined }], [file, {}], [{ uri: ' ' }], [{ uri: 1 }]]) {
    await assert.rejects(api.parseMenuFile(bad), /select it again/);
  }
  assert.equal(uploads.length, 0, 'Invalid files must never reach native upload');
  await api.parseMenuFile([file]);
  assert.equal(uploads[0].uri, file.uri);
  assert.equal(uploads[0].options.mimeType, 'image/png');
  await api.parseMenuFile([file, { ...file, uri: 'file:///second.jpg' }]);
  assert.equal(uploads[1].length, 2);
  assert.equal(uploads[1][1][1].uri, 'file:///second.jpg');

  let cursor = 0;
  const state = [], alerts = [], parsed = [];
  let result, permission = true, compressionFails = false, docOptions;
  const component = name => Object.assign(() => {}, { displayName: name });
  const native = Object.fromEntries(['View', 'Image', 'ScrollView', 'KeyboardAvoidingView'].map(n => [n, component(n)]));
  Object.assign(native, { Platform: { OS: os }, StyleSheet: { create: x => x },
    useWindowDimensions: () => ({ width: 390 }), Alert: { alert: (...args) => alerts.push(args) } });
  const paper = Object.fromEntries(['Button', 'Card', 'Text', 'Surface', 'Menu', 'ActivityIndicator', 'Portal', 'Dialog', 'TextInput'].map(n => [n, component(n)]));
  paper.Card.Content = component('Card.Content');
  paper.Menu.Item = component('Menu.Item');
  paper.TextInput.Icon = component('TextInput.Icon');
  paper.useTheme = () => ({ colors: {} });
  const words = new Proxy({}, { get: (_, key) => key === 'shareTargets' ? {} : String(key) });
  const Home = load('screens/HomeScreen.js', {
    react: { createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      useState: initial => { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; },
      useRef: () => ({ current: null }), useEffect() {} },
    'react-native': native, 'react-native-paper': paper,
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ bottom: 0, top: 0 }) },
    '../storage/menuStorage': { saveMenuHistory: async () => {} },
    'expo-image-picker': {
      requestMediaLibraryPermissionsAsync: async () => ({ granted: permission }),
      requestCameraPermissionsAsync: async () => ({ granted: permission }),
      launchImageLibraryAsync: async () => result, launchCameraAsync: async () => result,
    },
    'expo-document-picker': { getDocumentAsync: async options => { docOptions = options; return result; } },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, manipulateAsync: async () => {
      if (compressionFails) throw new Error('Test compression failure');
      return { uri: 'file:///compressed.jpg' };
    } },
    '../api': api, '../utils/ads': {},
    '../i18n': { getText: () => ({ home: words }), LANGUAGES: [], SOURCE_LANGUAGES: [], getLanguageLabel: () => '' },
    '../components/FloatingToolbar': component('Toolbar'),
  }).default;
  const render = () => { cursor = 0; return Home({ targetLang: 'en', onMenuParsed: data => parsed.push(data), adsReady: false }); };
  const flatten = node => !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(flatten) : [node, ...node.children.flatMap(flatten)];
  const press = icon => flatten(render()).find(node => node.props.icon === icon).props.onPress();
  const previews = () => flatten(render()).filter(node => node.type === native.Image).map(node => node.props.source.uri);
  for (const icon of ['image-outline', 'camera-outline', 'file-document-outline']) {
    result = { canceled: false, assets: [file] };
    await press(icon);
    assert.deepEqual(previews(), [file.uri], `${os}: ${icon} must display the selected image`);
    if (icon === 'file-document-outline') assert.equal(docOptions.copyToCacheDirectory, true);
  }
  result = { canceled: true, assets: null };
  await press('image-outline');
  assert.deepEqual(previews(), [file.uri], 'Cancel preserves the previous selection');
  result = { canceled: false, assets: [{}] };
  await press('image-outline');
  assert.equal(alerts.length, 1);
  assert.deepEqual(previews(), [file.uri]);
  permission = false;
  await press('camera-outline');
  assert.equal(alerts.length, 2);
  assert.deepEqual(previews(), [file.uri]);
  permission = true;
  result = { canceled: false, assets: [{ ...file, fileSize: 0 }] };
  await press('image-outline');
  assert.equal(alerts.length, 3);
  const pdf = { uri: 'file:///menu.pdf', name: 'menu.pdf', mimeType: 'application/pdf' };
  result = { canceled: false, assets: [pdf] };
  await press('file-document-outline');
  assert.equal(previews().length, 0, 'PDFs use a filename preview, not an Image');
  assert.ok(flatten(render()).some(node => node.children.includes(pdf.name)));
  await press('magic-staff');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(uploads.at(-1).options.mimeType, 'application/pdf');
  result = { canceled: false, assets: [file, { ...file, uri: 'file:///second.png' }] };
  await press('image-outline');
  assert.equal(previews().length, 2);
  await press('magic-staff');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(parsed.length, 2, 'Selection must reach the analysis result callback');
  result = { canceled: false, assets: [file] };
  await press('image-outline');
  compressionFails = true;
  await press('magic-staff');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(uploads.at(-1).uri, file.uri);
  assert.equal(uploads.at(-1).options.mimeType, file.mimeType, 'Compression fallback must preserve the original format');
  console.log(`${os}: picker preview, cancel, invalid input, single/multi upload and compression fallback passed`);
}

(async () => { for (const os of ['android', 'ios']) await check(os); })().catch(error => {
  console.error(error); process.exitCode = 1;
});
