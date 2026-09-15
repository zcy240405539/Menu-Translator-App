// Run: node tests/cart-screen.cjs. Native interfaces are mocked; device tests are separate.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const babel = require("@babel/core");

const filename = path.join(__dirname, "..", "screens", "CartScreen.js");
const { code } = babel.transformSync(fs.readFileSync(filename, "utf8"), {
  filename,
  configFile: false,
  babelrc: false,
  plugins: [
    "@babel/plugin-transform-react-jsx",
    "@babel/plugin-transform-modules-commonjs",
  ],
});

const component = (name) => Object.assign(() => {}, { displayName: name });
const React = {
  createElement: (type, props, ...children) => ({
    type,
    props: props || {},
    children,
  }),
  useEffect: (effect) => effect(),
  useState: (initial) => [
    [
      {
        cartId: "dish-1",
        quantity: 1,
        dish: { original_name: "Soup", translated_name: "Soup", price: "5.00" },
        menuInfo: { source_language: "en", currency: "$" },
      },
    ],
    () => {},
  ],
};
const native = {
  View: component("View"),
  StyleSheet: { create: (styles) => styles },
  FlatList: component("FlatList"),
  Platform: { OS: "android" },
};
const paper = Object.fromEntries(
  ["Card", "Appbar", "Text", "Surface", "Button", "Chip", "IconButton", "TouchableRipple"].map(
    (name) => [name, component(name)]
  )
);
paper.Card.Content = component("Card.Content");
paper.Appbar.Header = component("Appbar.Header");
paper.Appbar.BackAction = component("Appbar.BackAction");
paper.Appbar.Content = component("Appbar.Content");
paper.Appbar.Action = component("Appbar.Action");
paper.useTheme = () => ({ colors: {} });

const exportsObject = {};
vm.runInNewContext(
  code,
  {
    exports: exportsObject,
    console,
    require: (name) => {
      const mocks = {
        react: React,
        "react-native": native,
        "react-native-paper": paper,
        "../storage/cartStorage": {
          getCartItems: async () => [],
          removeDishFromCart: async () => [],
          clearCart: async () => {},
          updateCartItemQuantity: async () => [],
        },
        "../utils/price": {
          extractPriceNumber: Number.parseFloat,
          formatPrice: String,
          getCurrencySymbol: () => "$",
          getUserCurrencySymbol: () => "$",
        },
        "../i18n": {
          getText: () => ({
            cart: { heading: "Order", items: "items", total: "Total", clear: "Clear", empty: "Empty" },
            common: { dishFallback: "Dish" },
          }),
        },
        "../components/FloatingToolbar": component("FloatingToolbar"),
      };
      assert.ok(name in mocks, `Missing mock: ${name}`);
      return mocks[name];
    },
  },
  { filename }
);

const tree = exportsObject.default({ targetLang: "en" });
const flat = (node) => {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(flat);
  return [node, ...(node.children || []).flatMap(flat)];
};
const list = flat(tree).find((node) => node.type === native.FlatList);
assert.ok(list, "Cart screen must render its item list");
const itemTree = list.props.renderItem({
  item: {
    cartId: "dish-1",
    quantity: 1,
    dish: { original_name: "Soup", translated_name: "Soup", price: "5.00" },
    menuInfo: { source_language: "en", currency: "$" },
  },
});
assert.ok(
  flat(itemTree).some((node) => node.type === paper.TouchableRipple),
  "Quantity controls must use react-native-paper TouchableRipple"
);
assert.ok(flat(itemTree).every((node) => node.type !== undefined), "Rendered item components must be valid");
console.log("Cart screen renders non-empty orders with valid quantity controls");
