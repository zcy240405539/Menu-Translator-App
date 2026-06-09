import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "DISH_CART";
let cloudSyncHandler = null;

export function setCartCloudSyncHandler(handler) {
  cloudSyncHandler = typeof handler === "function" ? handler : null;
}

async function persistCart(items, options = {}) {
  const safeItems = Array.isArray(items) ? items : [];

  if (options.removeLocal) {
    await AsyncStorage.removeItem(CART_KEY);
  } else {
    await AsyncStorage.setItem(CART_KEY, JSON.stringify(safeItems));
  }

  if (!options.skipCloudSync && cloudSyncHandler) {
    cloudSyncHandler(safeItems).catch((err) => {
      console.warn("Cloud cart sync failed:", err);
    });
  }

  return safeItems;
}

export async function getCartItems() {
  const raw = await AsyncStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addDishToCart(dish, menuInfo = {}) {
  const cart = await getCartItems();

  const existingIndex = cart.findIndex(
    (item) =>
      item.dish?.id === dish.id &&
      item.menuInfo?.restaurant_type === menuInfo.restaurant_type
  );

  let updated;

  if (existingIndex >= 0) {
    updated = cart.map((item, index) =>
      index === existingIndex
        ? { ...item, quantity: (item.quantity || 1) + 1 }
        : item
    );
  } else {
    const newItem = {
      cartId: Date.now().toString(),
      addedAt: new Date().toISOString(),
      quantity: 1,
      dish,
      menuInfo,
    };

    updated = [newItem, ...cart];
  }

  return persistCart(updated);
}

export async function updateCartItemQuantity(cartId, quantity) {
  const cart = await getCartItems();

  const safeQuantity = Math.max(1, quantity);

  const updated = cart.map((item) =>
    item.cartId === cartId
      ? { ...item, quantity: safeQuantity }
      : item
  );

  return persistCart(updated);
}

export async function removeDishFromCart(cartId) {
  const cart = await getCartItems();
  const updated = cart.filter((item) => item.cartId !== cartId);

  return persistCart(updated);
}

export async function clearCart() {
  await persistCart([], { removeLocal: true });
}

export async function setCartItems(items, options = {}) {
  return persistCart(items, options);
}
