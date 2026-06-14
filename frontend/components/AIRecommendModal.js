import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Pressable,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { InterstitialAd, AdEventType, BannerAd, BannerAdSize, AD_UNIT_IDS } from "../utils/ads";

const DIET_OPTIONS = [
  { key: "Vegetarian", labelEn: "Vegetarian", labelZh: "素食", labelZht: "素食", labelEs: "Vegetariano" },
  { key: "Halal", labelEn: "Halal", labelZh: "清真", labelZht: "清真", labelEs: "Halal" },
  { key: "Kosher", labelEn: "Kosher", labelZh: "犹太", labelZht: "猶太", labelEs: "Kosher" },
  { key: "Keto", labelEn: "Keto", labelZh: "生酮", labelZht: "生酮", labelEs: "Keto" },
  { key: "Gluten-Free", labelEn: "Gluten-Free", labelZh: "无麸质", labelZht: "無麩質", labelEs: "Sin Gluten" },
];

const KeyboardContainer = Platform.OS === 'web' ? View : KeyboardAvoidingView;

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
  currentUser,
  onOpenLogin,
  onOpenProfile,
}) {
  const [people, setPeople] = useState("");
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [budget, setBudget] = useState("");
  const [taste, setTaste] = useState("");
  const [allergiesText, setAllergiesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [recommendationText, setRecommendationText] = useState("");
  const [recommendedItems, setRecommendedItems] = useState([]);
  const [addedItemIds, setAddedItemIds] = useState({});
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopLayout = isWeb && width >= 900;
  const shouldHideAppTitle = isWeb && (width < 520 || height < 560);
  const insets = useSafeAreaInsets();

  // Populate guest/user preferences when modal is opened
  useEffect(() => {
    if (visible) {
      if (currentUser) {
        setSelectedDiets(currentUser.diets || []);
        setAllergiesText(currentUser.allergies ? currentUser.allergies.join(", ") : "");
        setBudget(currentUser.budget || "");
        setTaste(currentUser.taste || "");
      } else {
        setPeople("");
        setSelectedDiets([]);
        setAllergiesText("");
        setBudget("");
        setTaste("");
      }
      setRecommendationText("");
      setRecommendedItems([]);
    }
  }, [visible, currentUser]);

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

  const handleDietToggle = useCallback((dietKey) => {
    setSelectedDiets((prev) =>
      prev.includes(dietKey)
        ? prev.filter((k) => k !== dietKey)
        : [...prev, dietKey]
    );
  }, []);

  const handleGenerate = async () => {
    let adShown = false;
    let recResult = null;
    let recError = null;
    let adClosed = false;

    try {
      setLoading(true);
      setError("");
      
      const allergies = allergiesText
        ? allergiesText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
        : [];

      const executeGenerate = async () => {
        try {
          const res = await getAIRecommendations(
            menuItems,
            people,
            selectedDiets,
            budget,
            taste,
            targetLang,
            allergies
          );
          return { data: res };
        } catch (err) {
          return { error: err };
        }
      };

      const finishProcess = (result, error) => {
        if (result) {
          setRecommendationText(result.recommendation || "");
          setRecommendedItems(result.items || []);
          setAddedItemIds({});
        } else if (error) {
          console.warn("AI Recommend failed:", error);
          setError(t.recommend.error || "Failed to generate recommendation");
        }
        setLoading(false);
      };

      // 1. Start generation
      executeGenerate().then(({ data, error }) => {
        if (data) recResult = data;
        if (error) recError = error;
        
        if (!adShown || adClosed) {
          finishProcess(recResult, recError);
        }
      });

      // 2. Start Ad
      if (Platform.OS !== "web" && InterstitialAd) {
        const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.recommendInterstitial);
        
        let adTimeout = setTimeout(() => {
          if (!adShown) {
            adClosed = true;
            if (recResult || recError) finishProcess(recResult, recError);
          }
        }, 5000); // Wait up to 5 seconds

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
          clearTimeout(adTimeout);
          adShown = true;
          interstitial.show().catch((err) => {
            console.warn("Failed to show interstitial ad:", err);
            adClosed = true;
            if (recResult || recError) finishProcess(recResult, recError);
          });
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
          adClosed = true;
          if (recResult || recError) finishProcess(recResult, recError);
        });

        interstitial.addAdEventListener(AdEventType.ERROR, (err) => {
          console.warn("Interstitial ad error:", err);
          clearTimeout(adTimeout);
          adClosed = true;
          if (recResult || recError) finishProcess(recResult, recError);
        });

        interstitial.load();
      } else {
        adClosed = true;
      }

    } catch (err) {
      console.warn("AI Recommend init failed:", err);
      setError(t.recommend.error || "Failed to generate recommendation");
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
        <Surface style={[styles.screen, isDesktopLayout && styles.screenDesktop, { paddingBottom: insets.bottom }]}>
          <Appbar.Header mode="center-aligned" style={[styles.appbar, isDesktopLayout && styles.appbarDesktop]}>
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title={shouldHideAppTitle ? "" : t.recommend.title} />
            <Appbar.Action icon="share-variant" onPress={handleShare} />
            <Appbar.Action icon="history" onPress={handleOpenHistory} />
            <Appbar.Action icon="cart-outline" onPress={handleOpenCart} />
            <Appbar.Action icon={currentUser ? "account-check" : "account-circle-outline"} onPress={() => {
              onClose();
              if (currentUser) {
                if (onOpenProfile) onOpenProfile();
              } else {
                if (onOpenLogin) onOpenLogin();
              }
            }} />
          </Appbar.Header>

          <KeyboardContainer
            behavior={Platform.OS === "web" ? undefined : (Platform.OS === "ios" ? "padding" : "height")}
            style={styles.keyboardContainer}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator animating size="large" color="#6750A4" />
                <Text style={styles.loadingText}>{t.recommend.generating}</Text>
              </View>
            ) : recommendationText ? (
              // 推荐结果页面
              <View style={{ flex: 1 }}>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.content, isDesktopLayout && styles.contentDesktop]}>
                <Card mode={isDesktopLayout ? "outlined" : "elevated"} style={[styles.card, isDesktopLayout && styles.cardDesktop]}>
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

                    <View style={isDesktopLayout ? styles.recommendationGridDesktop : undefined}>
                    {matchedItems.map(({ dish, reason }) => {
                      const displayName = dish.translated_name || dish.name || dish.original_name;
                      const displayOriginalName = dish.original_name;
                      const price = formatPrice(dish.price, {
                        sourceLanguage: dish.source_language || menuInfo?.source_language,
                        currency: dish.currency || menuInfo?.currency,
                        targetLanguage: targetLang,
                      });
                      const isAdded = !!addedItemIds[dish.id];

                      return (
                        <Card
                          key={dish.id}
                          mode="elevated"
                          style={[styles.dishCard, isDesktopLayout && styles.dishCardDesktop]}
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

                {Platform.OS !== "web" && BannerAd && (
                  <View style={styles.bannerContainer}>
                    <BannerAd
                      unitId={AD_UNIT_IDS.recommendBanner}
                      size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
                      requestOptions={{
                        requestNonPersonalizedAdsOnly: true,
                      }}
                      onAdFailedToLoad={(error) => console.warn("BannerAd error:", error)}
                    />
                  </View>
                )}
              </View>
            ) : (
              // 选项输入表单页面
              <ScrollView contentContainerStyle={[styles.content, isDesktopLayout && styles.contentDesktop]}>
                <Card mode={isDesktopLayout ? "outlined" : "elevated"} style={[styles.card, isDesktopLayout && styles.cardDesktop]}>
                  <Card.Content style={isDesktopLayout ? styles.formCardContentDesktop : undefined}>
                    <Text variant="bodyMedium" style={styles.introText}>
                      {isChineseLanguage(targetLang)
                        ? "告诉 AI 您的偏好，为您生成定制的配餐方案和推荐菜品。"
                        : "Tell AI your preferences and get a customized recommendation."}
                    </Text>

                    <View style={[styles.formGrid, isDesktopLayout && styles.formGridDesktop]}>
                      <View style={styles.formField}>
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
                      </View>

                      <View style={styles.formField}>
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
                      </View>

                      <View style={styles.formFieldWide}>
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
                      </View>

                      <View style={styles.formField}>
                        <Text variant="titleSmall" style={styles.label}>
                          {t.detail.allergens}
                        </Text>
                        <TextInput
                          mode="outlined"
                          value={allergiesText}
                          onChangeText={setAllergiesText}
                          placeholder={
                            isChineseLanguage(targetLang)
                              ? (targetLang === "zh-Hant" ? "例如：花生、海鮮（逗號分隔）" : "例如：花生、海鲜（逗号分隔）")
                              : "e.g., peanut, seafood (comma separated)"
                          }
                          style={styles.input}
                        />
                      </View>

                      <View style={styles.formField}>
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
                      </View>
                    </View>
                  </Card.Content>
                </Card>

                {!!error && (
                  <Text variant="bodyMedium" style={styles.errorText}>
                    ⚠️ {error}
                  </Text>
                )}

                <View style={[styles.generateBtnContainer, loading && { opacity: 0.7 }]}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={loading}
                    onPress={handleGenerate}
                    style={({ pressed }) => [
                      styles.generateBtn,
                      pressed && !loading && { opacity: 0.8 }
                    ]}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    ) : (
                      <MaterialCommunityIcons name="brain" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                    )}
                    <Text style={styles.generateBtnLabel}>
                      {t.recommend.generateBtn}
                    </Text>
                  </Pressable>
                </View>
              </ScrollView>
            )}
          </KeyboardContainer>

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
  screenDesktop: {
    backgroundColor: "#F7F7FA",
  },
  appbar: {
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#FDF8F3',
    elevation: 0,
    width: "100%",
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: "center",
  },
  appbarDesktop: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E0EC",
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    alignSelf: "center",
    width: "100%",
    maxWidth: Platform.OS === 'web' ? 640 : "100%",
  },
  contentDesktop: {
    width: "100%",
    maxWidth: 1180,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 48,
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
  cardDesktop: {
    borderRadius: 8,
    borderColor: "#E7E0EC",
    marginTop: 0,
  },
  formCardContentDesktop: {
    padding: 28,
  },
  formGrid: {
    gap: 4,
  },
  formGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 18,
  },
  formField: {
    flexGrow: 1,
    minWidth: 260,
    width: Platform.OS === 'web' ? 'auto' : '100%',
  },
  formFieldWide: {
    flexGrow: 1,
    width: '100%',
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
  generateBtnContainer: {
    marginTop: 12,
    alignSelf: "center",
    width: "100%",
    maxWidth: Platform.OS === "web" ? 320 : "100%",
    backgroundColor: "#6750A4",
  },
  generateBtnLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  generateBtn: {
    backgroundColor: "#6750A4",
    borderRadius: 100,
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  generateBtnLabel: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  recommendationText: {
    color: "#625B71",
    lineHeight: 22,
    marginTop: 8,
  },
  itemsSection: {
    marginVertical: 12,
  },
  recommendationGridDesktop: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
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
  dishCardDesktop: {
    borderRadius: 8,
    flexBasis: "31.9%",
    flexGrow: 1,
    minWidth: 280,
    marginBottom: 0,
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
  bannerContainer: {
    marginTop: 24,
    alignItems: "center",
    width: "100%",
  },
});
