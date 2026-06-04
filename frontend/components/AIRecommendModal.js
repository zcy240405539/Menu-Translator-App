import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  Portal,
  Surface,
  Text,
  TextInput,
  Snackbar,
} from "react-native-paper";

import { addDishToCart } from "../storage/cartStorage";
import { getText, isChineseLanguage } from "../i18n";
import { getAIRecommendations } from "../api";
import { formatPrice } from "../utils/price";

const DIET_OPTIONS = [
  { key: "Vegetarian", labelEn: "Vegetarian", labelZh: "素食", labelZht: "素食", labelEs: "Vegetariano" },
  { key: "Halal", labelEn: "Halal", labelZh: "清真", labelZht: "清真", labelEs: "Halal" },
  { key: "Kosher", labelEn: "Kosher", labelZh: "犹太", labelZht: "猶太", labelEs: "Kosher" },
  { key: "Keto", labelEn: "Keto", labelZh: "生酮", labelZht: "生酮", labelEs: "Keto" },
  { key: "Gluten-Free", labelEn: "Gluten-Free", labelZh: "无麸质", labelZht: "無麩質", labelEs: "Sin Gluten" },
];

export default function AIRecommendModal({
  visible,
  menuItems,
  targetLang,
  onClose,
  menuInfo,
  onPressDish,
  onOpenHistory,
  onOpenCart,
  onShare,
  menuHash,
}) {
  const [people, setPeople] = useState("");
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [budget, setBudget] = useState("");
  const [taste, setTaste] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recommendationText, setRecommendationText] = useState("");
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [addedItemIds, setAddedItemIds] = useState({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);

  const lang = isChineseLanguage(targetLang) ? targetLang : "en";
  const isTraditional = targetLang === "zh-Hant";
  const t = getText(lang);

  const handleOpenHistory = () => {
    onClose();
    if (onOpenHistory) onOpenHistory();
  };

  const handleOpenCart = () => {
    onClose();
    if (onOpenCart) onOpenCart();
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    }
  };

  const handleDietToggle = (dietKey) => {
    if (selectedDiets.includes(dietKey)) {
      setSelectedDiets(selectedDiets.filter((k) => k !== dietKey));
    } else {
      setSelectedDiets([...selectedDiets, dietKey]);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError("");
      
      const res = await getAIRecommendations(
        menuItems,
        people,
        selectedDiets,
        budget,
        taste,
        targetLang
      );

      setRecommendationText(res.recommendation || "");
      setRecommendedItems(res.items || []);
      setAddedItemIds({});
    } catch (err) {
      console.warn("AI Recommend failed:", err);
      setError(t.recommend.error || "Failed to generate recommendation");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setRecommendationText("");
    setRecommendedItems([]);
    setAddedItemIds({});
    setError("");
  };

  const handleAddItem = async (dish) => {
    await addDishToCart(dish, menuInfo);
    setAddedItemIds((prev) => ({ ...prev, [dish.id]: true }));
    setSnackbarVisible(true);
  };

  const getDietLabel = (diet) => {
    if (lang === "zh-Hant") return diet.labelZht;
    if (lang === "zh") return diet.labelZh;
    if (lang === "es") return diet.labelEs;
    return diet.labelEn;
  };

  const matchedItems = recommendedItems
    .map((rec) => {
      const matchedDish = menuItems.find((dish) => dish.id === rec.id);
      if (!matchedDish) return null;
      return {
        dish: matchedDish,
        reason: rec.reason,
      };
    })
    .filter(Boolean);

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <Surface style={styles.screen}>
          <Appbar.Header mode="center-aligned" style={styles.appbar}>
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title={t.recommend.title} />
            <Appbar.Action icon="share-variant" onPress={handleShare} />
            <Appbar.Action icon="history" onPress={handleOpenHistory} />
            <Appbar.Action icon="cart-outline" onPress={handleOpenCart} />
            <Appbar.Action icon="account-circle-outline" onPress={() => console.log("Login pressed")} />
          </Appbar.Header>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardContainer}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator animating size="large" color="#6750A4" />
                <Text style={styles.loadingText}>{t.recommend.generating}</Text>
              </View>
            ) : recommendationText ? (
              // 推荐结果页面
              <ScrollView contentContainerStyle={styles.content}>
                <Card mode="elevated" style={styles.card}>
                  <Card.Content>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      {t.recommend.suggestionTitle}
                    </Text>
                    <Text variant="bodyMedium" style={styles.recommendationText}>
                      {recommendationText}
                    </Text>
                  </Card.Content>
                </Card>

                {matchedItems.length > 0 && (
                  <View style={styles.itemsSection}>
                    <Text variant="titleMedium" style={styles.sectionTitle}>
                      {t.recommend.recommendedItemsTitle}
                    </Text>

                    {matchedItems.map(({ dish, reason }) => {
                      const displayName = dish.translated_name || dish.name || dish.original_name;
                      const displayOriginalName = dish.original_name;
                      const price = formatPrice(dish.price, {
                        sourceLanguage: dish.source_language || menuInfo?.source_language,
                      });
                      const isAdded = !!addedItemIds[dish.id];

                      return (
                        <Card
                          key={dish.id}
                          mode="elevated"
                          style={styles.dishCard}
                          onPress={() => onPressDish && onPressDish(dish)}
                        >
                          <Card.Content>
                            <View style={styles.dishHeader}>
                              <View style={styles.dishNameBox}>
                                <Text variant="titleMedium" style={styles.dishName}>
                                  {displayName}
                                </Text>
                                <Text variant="bodySmall" style={styles.dishOriginalName}>
                                  {displayOriginalName}
                                </Text>
                              </View>
                              {!!price && (
                                <Chip compact style={styles.priceChip} textStyle={styles.priceText}>
                                  {price}
                                </Chip>
                              )}
                            </View>
                            <Text variant="bodyMedium" style={styles.reasonText}>
                              💡 {reason}
                            </Text>

                            <Button
                              mode={isAdded ? "outlined" : "contained-tonal"}
                              icon={isAdded ? "check" : "cart-plus"}
                              onPress={() => handleAddItem(dish)}
                              disabled={isAdded}
                              style={styles.dishAddBtn}
                            >
                              {isAdded ? t.recommend.addedBtn : t.recommend.addBtn}
                            </Button>
                          </Card.Content>
                        </Card>
                      );
                    })}
                  </View>
                )}

                <Button
                  mode="contained"
                  icon="refresh"
                  onPress={handleReset}
                  style={styles.actionBtn}
                  contentStyle={styles.btnContent}
                >
                  {t.recommend.backBtn}
                </Button>

                <Button
                  mode="outlined"
                  icon="close"
                  onPress={onClose}
                  style={styles.actionBtn}
                  contentStyle={styles.btnContent}
                >
                  {t.recommend.closeBtn}
                </Button>
              </ScrollView>
            ) : (
              // 选项输入表单页面
              <ScrollView contentContainerStyle={styles.content}>
                <Card mode="elevated" style={styles.card}>
                  <Card.Content>
                    <Text variant="bodyMedium" style={styles.introText}>
                      {isChineseLanguage(targetLang)
                        ? "告诉 AI 您的偏好，为您生成定制的配餐方案和推荐菜品。"
                        : "Tell AI your preferences and get a customized recommendation."}
                    </Text>

                    {/* 用餐人数 */}
                    <Text variant="titleSmall" style={styles.label}>
                      {t.recommend.peopleLabel}
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={people}
                      onChangeText={setPeople}
                      keyboardType="numeric"
                      placeholder={t.recommend.peoplePlaceholder}
                      style={styles.input}
                    />

                    {/* 饮食限制 */}
                    <Text variant="titleSmall" style={styles.label}>
                      {t.recommend.dietLabel}
                    </Text>
                    <View style={styles.chipRow}>
                      {DIET_OPTIONS.map((diet) => {
                        const isSelected = selectedDiets.includes(diet.key);
                        return (
                          <Chip
                            key={diet.key}
                            selected={isSelected}
                            onPress={() => handleDietToggle(diet.key)}
                            style={[
                              styles.dietChip,
                              isSelected && styles.dietChipSelected,
                            ]}
                            selectedColor={isSelected ? "#FFFFFF" : "#625B71"}
                            showSelectedOverlay
                          >
                            {getDietLabel(diet)}
                          </Chip>
                        );
                      })}
                    </View>

                    {/* 预算 */}
                    <Text variant="titleSmall" style={styles.label}>
                      {t.recommend.budgetLabel}
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={budget}
                      onChangeText={setBudget}
                      placeholder={t.recommend.budgetPlaceholder}
                      style={styles.input}
                    />

                    {/* 口味偏好 */}
                    <Text variant="titleSmall" style={styles.label}>
                      {t.recommend.tasteLabel}
                    </Text>
                    <TextInput
                      mode="outlined"
                      value={taste}
                      onChangeText={setTaste}
                      placeholder={t.recommend.tastePlaceholder}
                      style={styles.input}
                    />
                  </Card.Content>
                </Card>

                {!!error && (
                  <Text variant="bodyMedium" style={styles.errorText}>
                    ⚠️ {error}
                  </Text>
                )}

                <Button
                  mode="contained"
                  icon="brain"
                  onPress={handleGenerate}
                  style={styles.generateBtn}
                  contentStyle={styles.btnContent}
                >
                  {t.recommend.generateBtn}
                </Button>
              </ScrollView>
            )}
          </KeyboardAvoidingView>

          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={1500}
            style={styles.snackbar}
          >
            {isChineseLanguage(targetLang)
              ? (isTraditional ? "已加入待點列表" : "已加入待点列表")
              : "Added to order list"}
          </Snackbar>
        </Surface>
      </Modal>
    </Portal>
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
  keyboardContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: "#6750A4",
    fontWeight: "700",
  },
  introText: {
    color: "#625B71",
    marginBottom: 16,
    lineHeight: 20,
  },
  card: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    marginBottom: 16,
  },
  label: {
    fontWeight: "700",
    color: "#1D1B20",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#FFFFFF",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 4,
  },
  dietChip: {
    backgroundColor: "#F3EDF7",
  },
  dietChipSelected: {
    backgroundColor: "#6750A4",
  },
  generateBtn: {
    borderRadius: 100,
    marginTop: 12,
  },
  btnContent: {
    height: 52,
  },
  recommendationText: {
    color: "#625B71",
    lineHeight: 22,
    marginTop: 8,
  },
  itemsSection: {
    marginVertical: 12,
  },
  sectionTitle: {
    fontWeight: "800",
    color: "#1D1B20",
    marginBottom: 12,
  },
  dishCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  dishHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  dishNameBox: {
    flex: 1,
  },
  dishName: {
    fontWeight: "700",
    color: "#1D1B20",
  },
  dishOriginalName: {
    color: "#79747E",
    marginTop: 2,
    fontStyle: "italic",
  },
  priceChip: {
    backgroundColor: "#E8DEF8",
  },
  priceText: {
    color: "#6750A4",
    fontWeight: "700",
  },
  reasonText: {
    marginTop: 10,
    color: "#625B71",
    lineHeight: 20,
    fontStyle: "italic",
  },
  dishAddBtn: {
    alignSelf: "flex-end",
    marginTop: 12,
  },
  actionBtn: {
    borderRadius: 100,
    marginTop: 12,
  },
  errorText: {
    color: "#B3261E",
    marginVertical: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  snackbar: {
    marginBottom: 16,
  },
});
