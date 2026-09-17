// Run: node tests/cart-screen.cjs. Native components are mocked; device tests are separate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');

const filename = path.join(__dirname, '..', 'screens', 'CartScreen.js');
const { code } = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
  filename, configFile: false, babelrc: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
});

async function check(platform) {
  const component = name => Object.assign(() => {}, { displayName: name });
  const native = {
    View: component('View'),
    Platform: { OS: platform },
    StyleSheet: { create: value => value },
    FlatList: component('FlatList'),
  };
  const paper = Object.fromEntries(
    ['Card', 'Text', 'Surface', 'Button', 'Chip', 'IconButton', 'TouchableRipple'].map(name => [name, component(name)])
  );
  paper.Card.Content = component('Card.Content');
  paper.Appbar = { Header: component('Appbar.Header'), BackAction: component('Appbar.BackAction'),
    Content: component('Appbar.Content'), Action: component('Appbar.Action') };
  paper.useTheme = () => ({ colors: { background: '#fff', surface: '#fff', onSurface: '#000', onSurfaceVariant: '#555' } });

  const dish = { id: 'dish_1', original_name: 'Soup', translated_name: '汤', price: '12' };
  let cart = [{ cartId: 'cart_1', dish, quantity: 1, menuInfo: { currency: '$', source_language: 'en' } }];
  const storage = {
    getCartItems: async () => cart,
    removeDishFromCart: async id => (cart = cart.filter(item => item.cartId !== id)),
    clearCart: async () => { cart = []; },
    updateCartItemQuantity: async (id, quantity) => (cart = cart.map(item =>
      item.cartId === id ? { ...item, quantity: Math.max(1, quantity) } : item)),
  };
  const state = [];
  let cursor = 0;
  let effectRan = false;
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], value => { state[index] = value; }];
    },
    useEffect(effect) { if (!effectRan) { effectRan = true; effect(); } },
  };
  const mocks = {
    react, 'react-native': native, 'react-native-paper': paper,
    '../storage/cartStorage': storage,
    '../utils/price': { extractPriceNumber: Number, formatPrice: price => `$${price}`,
      getCurrencySymbol: () => '$', getUserCurrencySymbol: () => '$' },
    '../i18n': { getText: () => ({ cart: { heading: 'Order', items: 'items', total: 'Total',
      clear: 'Clear', remove: 'Remove', empty: 'Empty', shareMessage: 'Share' },
      common: { dishFallback: 'Dish' } }) },
    '../components/FloatingToolbar': component('FloatingToolbar'),
  };
  const exports = {};
  vm.runInNewContext(code, {
    exports, console, require: name => { assert.ok(name in mocks, `Missing mock: ${name}`); return mocks[name]; },
  }, { filename });
  const render = () => { cursor = 0; return exports.default({ targetLang: 'en', onGoHome() {} }); };
  const flatten = node => !node || typeof node !== 'object' ? [] :
    Array.isArray(node) ? node.flatMap(flatten) : [node, ...node.children.flatMap(flatten)];

  render();
  await new Promise(resolve => setImmediate(resolve));
  const list = flatten(render()).find(node => node.type === native.FlatList);
  assert.equal(list.props.data.length, 1);
  const itemTree = list.props.renderItem({ item: list.props.data[0] });
  const nodes = flatten(itemTree);
  assert.ok(nodes.every(node => typeof node.type === 'function'), `${platform}: invalid component in Order item`);
  const controls = nodes.filter(node => node.type === paper.TouchableRipple);
  assert.equal(controls.length, 2);
  await controls[1].props.onPress();
  const updatedList = flatten(render()).find(node => node.type === native.FlatList);
  assert.equal(updatedList.props.data[0].quantity, 2);
  const updatedControls = flatten(updatedList.props.renderItem({ item: updatedList.props.data[0] }))
    .filter(node => node.type === paper.TouchableRipple);
  await updatedControls[0].props.onPress();
  assert.equal(flatten(render()).find(node => node.type === native.FlatList).props.data[0].quantity, 1);
  await nodes.find(node => node.type === paper.Button).props.onPress();
  assert.equal(flatten(render()).find(node => node.type === native.FlatList).props.data.length, 0);
  console.log(`${platform}: Order item, quantity controls and removal passed`);
}

Promise.all(['android', 'ios'].map(check)).catch(error => { console.error(error); process.exitCode = 1; });
