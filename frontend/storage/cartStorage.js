import AsyncStorage from "@react-native-async-storage/async-storage";

const CART_KEY = "DISH_CART";

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

  await AsyncStorage.setItem(CART_KEY, JSON.stringify(updated));

  return updated;
}

export async function updateCartItemQuantity(cartId, quantity) {
  const cart = await getCartItems();

  const safeQuantity = Math.max(1, quantity);

  const updated = cart.map((item) =>
    item.cartId === cartId
      ? { ...item, quantity: safeQuantity }
      : item
  );

  await AsyncStorage.setItem(CART_KEY, JSON.stringify(updated));

  return updated;
}

export async function removeDishFromCart(cartId) {
  const cart = await getCartItems();
  const updated = cart.filter((item) => item.cartId !== cartId);

  await AsyncStorage.setItem(CART_KEY, JSON.stringify(updated));

  return updated;
}

export async function clearCart() {
  await AsyncStorage.removeItem(CART_KEY);
}