import AsyncStorage from "@react-native-async-storage/async-storage";

const MENU_HISTORY_KEY = "MENU_HISTORY";

export async function saveMenuHistory(menuResult, imageUri, targetLang) {
  const history = await getMenuHistory();

  const newRecord = {
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    imageUri,
    targetLang,
    business_name: menuResult?.business_name || null,
    restaurant_type: menuResult?.restaurant_type || "Restaurant",
    source_language: menuResult?.source_language || "Unknown",
    menu_items: menuResult?.menu_items || [],
    raw: menuResult,
  };

  const updated = [newRecord, ...history].slice(0, 20);

  await AsyncStorage.setItem(MENU_HISTORY_KEY, JSON.stringify(updated));

  return newRecord;
}

export async function getMenuHistory() {
  const raw = await AsyncStorage.getItem(MENU_HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function clearMenuHistory() {
  await AsyncStorage.removeItem(MENU_HISTORY_KEY);
}