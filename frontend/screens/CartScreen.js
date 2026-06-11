import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList, Platform, useWindowDimensions } from "react-native";
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

export default function CartScreen({ onBack, targetLang, onOpenHistory, onOpenCart, onShare, currentUser, onOpenLogin, onOpenProfile }) {
  const [items, setItems] = useState([]);
  const isChinese = isChineseLanguage(targetLang);
  const isTraditional = targetLang === "zh-Hant";
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopLayout = isWeb && width >= 900;
  const shouldHideAppTitle = isWeb && (width < 520 || height < 560);
  const columnCount = isDesktopLayout && width >= 1280 ? 3 : isDesktopLayout ? 2 : 1;

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
    <Surface style={[styles.screen, isDesktopLayout && styles.screenDesktop]}>
      <Appbar.Header mode="center-aligned" style={[styles.appbar, isDesktopLayout && styles.appbarDesktop]}>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={shouldHideAppTitle ? "" : isChinese ? (isTraditional ? "待點列表" : "待点列表") : "Order List"} />
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

      <View style={[styles.content, isDesktopLayout && styles.contentDesktop]}>
        <Card mode={isDesktopLayout ? "outlined" : "elevated"} style={[styles.summaryCard, isDesktopLayout && styles.summaryCardDesktop]}>
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
          key={`cart-${columnCount}`}
          data={items}
          numColumns={columnCount}
          columnWrapperStyle={columnCount > 1 ? styles.gridRow : undefined}
          keyExtractor={(item) => item.cartId}
          renderItem={({ item }) => (
            <View style={[styles.gridItem, isDesktopLayout && styles.gridItemDesktop]}>
              <Card mode="elevated" style={[styles.card, isDesktopLayout && styles.cardDesktop]}>
                <Card.Content style={styles.cardContent}>
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
                      <Chip style={styles.priceChip}>
                        {formatPrice(item.dish.price, {
                          sourceLanguage: item.menuInfo?.source_language || cartSourceLanguage,
                          currency: item.menuInfo?.currency || item.dish?.currency,
                          targetLanguage: targetLang,
                        })}
                      </Chip>
                    )}
                  </View>
                  <View style={styles.quantityRow}>
                    <Button
                        mode="outlined"
                        compact
                        onPress={async () => {
                        const updated = await updateCartItemQuantity(
                            item.cartId,
                            (item.quantity || 1) - 1
                        );
                        setItems(updated);
                        }}
                    >
                        -
                    </Button>

                    <Text style={styles.quantityText}>
                        {item.quantity || 1}
                    </Text>

                    <Button
                        mode="outlined"
                        compact
                        onPress={async () => {
                        const updated = await updateCartItemQuantity(
                            item.cartId,
                            (item.quantity || 1) + 1
                        );
                        setItems(updated);
                        }}
                    >
                        +
                    </Button>
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
            </View>
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
  screenDesktop: {
    backgroundColor: "#F7F7FA",
  },
  appbar: {
    backgroundColor: "#FDF8F3",
  },
  appbarDesktop: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E0EC",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  contentDesktop: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  summaryCard: {
    borderRadius: 28,
    marginBottom: 18,
    backgroundColor: "#FFFFFF",
  },
  summaryCardDesktop: {
    borderRadius: 8,
    borderColor: "#E7E0EC",
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
  cardDesktop: {
    borderRadius: 8,
    minHeight: 198,
    height: "100%",
    marginBottom: 0,
  },
  cardContent: {
    flex: 1,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
    minWidth: 0,
  },
  gridItemDesktop: {
    marginBottom: 0,
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
  priceChip: {
    backgroundColor: "#E8DEF8",
  },
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 12,
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
