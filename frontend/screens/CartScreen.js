import React, { useEffect, useState } from "react";
import { View, StyleSheet, FlatList } from "react-native";
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
import { extractPriceNumber, formatPrice, getCurrencySymbol } from "../utils/price";

function getDishName(dish) {
  return dish.translated_name || dish.original_name || "Dish";
}

export default function CartScreen({ onBack, targetLang }) {
  const [items, setItems] = useState([]);

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

  const total = items.reduce((sum, item) => {
    const num = extractPriceNumber(item.dish?.price);
    const quantity = item.quantity || 1;
  
    return num !== null ? sum + num * quantity : sum;
  }, 0);

  return (
    <Surface style={styles.screen}>
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={targetLang === "zh" ? "待点列表" : "Order List"} />
        <Appbar.Action
          icon="delete-outline"
          onPress={async () => {
            await clearCart();
            setItems([]);
          }}
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Card mode="elevated" style={styles.summaryCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {targetLang === "zh" ? "我的待点列表" : "My Order List"}
            </Text>
            <Text style={styles.subtitle}>
              {items.length} {targetLang === "zh" ? "道菜" : "items"} · Total: {getCurrencySymbol(cartSourceLanguage)}{total.toFixed(2)}
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
                    <Chip style={styles.priceChip}>
                      {formatPrice(item.dish.price, {
                        sourceLanguage: item.menuInfo?.source_language || cartSourceLanguage,
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
                  {targetLang === "zh" ? "删除" : "Remove"}
                </Button>
              </Card.Content>
            </Card>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {targetLang === "zh" ? "还没有加入任何菜品" : "No dishes added yet"}
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
    backgroundColor: "#FDF8F3",
  },
  content: {
    flex: 1,
    padding: 16,
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
