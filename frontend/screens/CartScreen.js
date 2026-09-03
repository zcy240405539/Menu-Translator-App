import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Platform, TouchableRipple } from "react-native";
import {
  Card,
  Text,
  Surface,
  Button,
  Chip,
  IconButton,
  useTheme,
} from "react-native-paper";

import {
  getCartItems,
  removeDishFromCart,
  clearCart,
  updateCartItemQuantity,
} from "../storage/cartStorage";
import { extractPriceNumber, formatPrice, getCurrencySymbol, getUserCurrencySymbol } from "../utils/price";
import { getText } from "../i18n";
import FloatingToolbar from "../components/FloatingToolbar";

function getDishName(dish, fallback) {
  return dish.translated_name || dish.original_name || fallback;
}

export default function CartScreen({ onBack, targetLang, onOpenHistory, onOpenCart, onShare, onGoHome, onOpenSettings }) {
  const [items, setItems] = useState([]);
  const t = getText(targetLang);
  const theme = useTheme();

  const loadCart = async () => {
    const data = await getCartItems();
    setItems(data);
  };

  useEffect(() => {
    loadCart();
  }, []);

  const cartSourceLanguage =
    items.find((item) => item.menuInfo?.source_language)?.menuInfo?.source_language ||
    targetLang;

  const cartCurrencySymbol =
    items.find((item) => item.menuInfo?.currency)?.menuInfo?.currency ||
    getUserCurrencySymbol() ||
    getCurrencySymbol(cartSourceLanguage);

  const total = items.reduce((sum, item) => {
    const num = extractPriceNumber(item.dish?.price);
    const quantity = item.quantity || 1;
  
    return num !== null ? sum + num * quantity : sum;
  }, 0);

  return (
    <Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Card mode="elevated" style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.summaryHeader}>
              <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.onSurface }]}>
                {t.cart.heading}
              </Text>
              <IconButton
                icon="delete-outline"
                accessibilityLabel={t.cart.clear}
                onPress={async () => {
                  await clearCart();
                  setItems([]);
                }}
              />
            </View>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              {items.length} {t.cart.items} · {t.cart.total}: {cartCurrencySymbol}{total.toFixed(2)}
            </Text>
          </Card.Content>
        </Card>

        <FlatList
          data={items}
          keyExtractor={(item) => item.cartId}
          renderItem={({ item }) => (
            <Card mode="elevated" style={[styles.card, { backgroundColor: theme.colors.surface }]}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={styles.nameBox}>
                    <Text variant="titleMedium" style={[styles.name, { color: theme.colors.onSurface }]}>
                      {getDishName(item.dish, t.common.dishFallback)}
                    </Text>

                    <Text style={[styles.original, { color: theme.colors.onSurfaceVariant }]}>
                      {item.dish?.original_name}
                    </Text>

                    {!!item.menuInfo?.restaurant_type && (
                      <Text style={[styles.restaurant, { color: theme.colors.onSurfaceVariant }]}>
                        {item.menuInfo.restaurant_type}
                      </Text>
                    )}
                  </View>

                  {!!item.dish?.price && (
                    <View style={styles.priceContainer}>
                      <Text style={styles.priceText}>
                        {formatPrice(item.dish.price, {
                          sourceLanguage: item.menuInfo?.source_language || cartSourceLanguage,
                          currency: item.menuInfo?.currency || item.dish?.currency,
                          targetLanguage: targetLang,
                        })}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={styles.quantityRow}>
                    <TouchableRipple
                        borderless
                        style={styles.quantityBtn}
                        onPress={async () => {
                          const updated = await updateCartItemQuantity(
                              item.cartId,
                              (item.quantity || 1) - 1
                          );
                          setItems(updated);
                        }}
                    >
                        <Text style={styles.quantityBtnText}>-</Text>
                    </TouchableRipple>

                    <Text style={[styles.quantityText, { color: theme.colors.onSurface }]}>
                        {item.quantity || 1}
                    </Text>

                    <TouchableRipple
                        borderless
                        style={styles.quantityBtn}
                        onPress={async () => {
                          const updated = await updateCartItemQuantity(
                              item.cartId,
                              (item.quantity || 1) + 1
                          );
                          setItems(updated);
                        }}
                    >
                        <Text style={styles.quantityBtnText}>+</Text>
                    </TouchableRipple>
                </View>
                <Button
                  mode="text"
                  icon="trash-can-outline"
                  onPress={async () => {
                    const updated = await removeDishFromCart(item.cartId);
                    setItems(updated);
                  }}
                >
                  {t.cart.remove}
                </Button>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
              {t.cart.empty}
            </Text>
          }
        />
      </View>
      <FloatingToolbar
        activeKey="cart"
        targetLang={targetLang}
        onGoHome={onGoHome || onBack}
        onShare={() => onShare && onShare(null, t.cart.shareMessage)}
        onOpenHistory={onOpenHistory}
        onOpenCart={onOpenCart}
        onOpenPreferences={onOpenSettings}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF8F3",
  },
  content: {
    flex: 1,
    padding: 16,
    alignSelf: "center",
    width: "100%",
    maxWidth: 960,
  },
  summaryCard: {
    borderRadius: 28,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    color: "#625B71",
  },
  card: {
    borderRadius: 22,
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  nameBox: {
    flex: 1,
  },
  name: {
    fontWeight: "700",
  },
  original: {
    marginTop: 4,
    color: "#79747E",
    fontStyle: "italic",
  },
  restaurant: {
    marginTop: 6,
    color: "#625B71",
  },
  priceContainer: {
    backgroundColor: "#E8DEF8",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: "flex-start",
    maxHeight: 24,
  },
  priceText: {
    color: "#6750A4",
    fontWeight: "700",
    fontSize: 12,
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
  },
  quantityBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#6750A4",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  quantityBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6750A4",
    textAlign: "center",
    lineHeight: Platform.OS === 'web' ? 20 : 22,
  },
  quantityText: {
    fontSize: 18,
    fontWeight: "700",
    minWidth: 28,
    textAlign: "center",
  },
  empty: {
    textAlign: "center",
    marginTop: 32,
    color: "#625B71",
  },
});
