import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Platform, TouchableRipple } from "react-native";
import {
  Appbar,
  Card,
  Text,
  Surface,
  Button,
  Chip,
} from "react-native-paper";

import {
  getCartItems,
  removeDishFromCart,
  clearCart,
  updateCartItemQuantity,
} from "../storage/cartStorage";
import { extractPriceNumber, formatPrice, getCurrencySymbol, getUserCurrencySymbol } from "../utils/price";
import { isChineseLanguage } from "../i18n";

function getDishName(dish) {
  return dish.translated_name || dish.original_name || "Dish";
}

export default function CartScreen({ onBack, targetLang, onOpenHistory, onOpenCart, onShare, currentUser, onOpenLogin, onOpenProfile, hasMenuResult, onBackToResult, onGoHome }) {
  const [items, setItems] = useState([]);
  const isChinese = isChineseLanguage(targetLang);
  const isTraditional = targetLang === "zh-Hant";

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
    <Surface style={styles.screen}>
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        {hasMenuResult ? (
          <>
            <Appbar.Action icon="close" onPress={onBackToResult} />
            <Appbar.Action icon="home-outline" onPress={onGoHome} />
          </>
        ) : (
          <Appbar.BackAction onPress={onBack} />
        )}
        <Appbar.Content title={isChinese ? (isTraditional ? "待點列表" : "待点列表") : "Order List"} />
        <Appbar.Action icon="share-variant" onPress={() => onShare && onShare(null, isChinese ? "分享我的待点列表并体验菜单翻译助手！" : "Check out my order list and Menu Translator!")} />
        <Appbar.Action icon="history" onPress={onOpenHistory} />
        <Appbar.Action icon="cart-outline" onPress={onOpenCart} />
        <Appbar.Action
          icon="delete-outline"
          onPress={async () => {
            await clearCart();
            setItems([]);
          }}
        />
        <Appbar.Action icon={currentUser ? "account-check" : "account-circle-outline"} onPress={() => currentUser ? onOpenProfile() : onOpenLogin()} />
      </Appbar.Header>

      <View style={styles.content}>
        <Card mode="elevated" style={styles.summaryCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {isChinese ? (isTraditional ? "我的待點列表" : "我的待点列表") : "My Order List"}
            </Text>
            <Text style={styles.subtitle}>
              {items.length} {isChinese ? "道菜" : "items"} · {isChinese ? (isTraditional ? "總計" : "总计") : "Total"}: {cartCurrencySymbol}{total.toFixed(2)}
            </Text>
          </Card.Content>
        </Card>

        <FlatList
          data={items}
          keyExtractor={(item) => item.cartId}
          renderItem={({ item }) => (
            <Card mode="elevated" style={styles.card}>
              <Card.Content>
                <View style={styles.row}>
                  <View style={styles.nameBox}>
                    <Text variant="titleMedium" style={styles.name}>
                      {getDishName(item.dish)}
                    </Text>

                    <Text style={styles.original}>
                      {item.dish?.original_name}
                    </Text>

                    {!!item.menuInfo?.restaurant_type && (
                      <Text style={styles.restaurant}>
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

                    <Text style={styles.quantityText}>
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
                  {isChinese ? (isTraditional ? "刪除" : "删除") : "Remove"}
                </Button>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {isChinese ? (isTraditional ? "還沒有加入任何菜品" : "还没有加入任何菜品") : "No dishes added yet"}
            </Text>
          }
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF8F3",
  },
  appbar: {
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#FDF8F3',
    elevation: 0,
    width: "100%",
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: "center",
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
