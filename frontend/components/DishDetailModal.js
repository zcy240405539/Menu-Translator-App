import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  Image,
  Animated,
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
  Snackbar,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { addDishToCart } from "../storage/cartStorage";
import { getText } from "../i18n";
import { getDishDetail } from "../api";
import { formatPrice } from "../utils/price";

function getTranslatedName(dish) {
  return (
    dish?.translated_name ||
    dish?.translated_name_zh ||
    dish?.translated_name_en ||
    dish?.name ||
    dish?.original_name ||
    ""
  );
}

function getTranslatedDescription(dish) {
  return (
    dish?.description ||
    dish?.description_zh ||
    dish?.description_en ||
    ""
  );
}

function normalizeArray(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => String(item));
}

function normalizeKey(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function InfoSection({ title, children }) {
  return (
    <View style={styles.infoSection}>
      <Text variant="titleMedium" style={styles.sectionTitle}>
        {title}
      </Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function DishDetailModal({
  visible,
  dish,
  targetLang,
  onClose,
  menuInfo,
}) {
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailKey, setDetailKey] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const lang = targetLang === "zh" ? "zh" : "en";
  const t = getText(lang).detail;

  const cacheKey = useMemo(() => {
    if (!dish) return null;
    const name = dish.original_name || dish.translated_name || dish.name || "";
    const sourceLang = dish.source_language || menuInfo?.source_language || "auto";
    const translatedName = dish.translated_name || dish.name || "";
    const section = dish.section_heading_original || dish.category || "";
    return `dish_detail_v4_${sourceLang}_${targetLang}_${normalizeKey(name)}_${normalizeKey(translatedName)}_${normalizeKey(section)}`;
  }, [dish, menuInfo?.source_language, targetLang]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!visible || !dish || !cacheKey) return;

      setDetail(null);
      setDetailKey(cacheKey);

      const baseName =
        dish.original_name ||
        dish.translated_name ||
        dish.name ||
        "";

      try {
        setLoadingDetail(true);

        const cachedText = await AsyncStorage.getItem(cacheKey);
        if (cachedText && !cancelled) {
          setDetail(JSON.parse(cachedText));
          setDetailKey(cacheKey);
          setLoadingDetail(false);
          return;
        }

        const remoteDetail = await getDishDetail(
          baseName,
          targetLang,
          dish.source_language || menuInfo?.source_language || "auto",
          dish
        );

        if (!cancelled) {
          setDetail(remoteDetail);
          setDetailKey(cacheKey);
          await AsyncStorage.setItem(cacheKey, JSON.stringify(remoteDetail));
        }
      } catch (err) {
        console.warn("Load dish detail failed:", err);
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    }

    loadDetail();

    return () => {
      cancelled = true;
    };
  }, [visible, dish, targetLang, cacheKey]);

  if (!dish) return null;

  const activeDetail = detailKey === cacheKey ? detail : null;
  const mergedDish = {
    ...dish,
    ...(activeDetail || {}),
    image_url: activeDetail?.image_url || dish.image_url,
    thumbnail_url: activeDetail?.thumbnail_url || dish.thumbnail_url,
  };

  const title = getTranslatedName(mergedDish);
  const description = getTranslatedDescription(mergedDish);
  const ingredients = normalizeArray(mergedDish.ingredients);
  const allergens = normalizeArray(mergedDish.allergens);
  const price = formatPrice(mergedDish.price || dish.price, {
    sourceLanguage:
      mergedDish.source_language ||
      dish.source_language ||
      menuInfo?.source_language,
  });
  const imageUrl = mergedDish.image_url || mergedDish.thumbnail_url;

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <Surface style={styles.screen}>
          <Appbar.Header mode="center-aligned" style={styles.appbar}>
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title={title || t.description} />
          </Appbar.Header>

          <ScrollView contentContainerStyle={styles.content}>
            <Card mode="elevated" style={styles.heroCard}>
              <View style={styles.imagePlaceholder}>
                {imageUrl ? (
                  <Image source={{ uri: imageUrl }} style={styles.dishImage} />
                ) : (
                  <View style={styles.defaultImageBox}>
                    <Text style={styles.defaultImageIcon}>🍽️</Text>
                    <Text style={styles.defaultImageText}>
                      {targetLang === "zh" ? "正在准备图片" : "Preparing image"}
                    </Text>
                  </View>
                )}

                {loadingDetail && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator animating size="small" />
                    <Text style={styles.imageLoadingText}>
                      {targetLang === "zh" ? "正在加载详情..." : "Loading details..."}
                    </Text>
                  </View>
                )}
              </View>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.title}>
                  {title}
                </Text>

                <Text variant="bodyMedium" style={styles.original}>
                  {t.original}: {mergedDish.original_name || t.unknown}
                </Text>

                {!!price && (
                  <Chip style={styles.priceChip} textStyle={styles.priceText}>
                    {t.price}: {price}
                  </Chip>
                )}
              </Card.Content>
            </Card>

            <Card mode="elevated" style={styles.detailCard}>
              <Card.Content>
                <InfoSection title={t.description}>
                  <Text variant="bodyMedium" style={styles.text}>
                    {description || t.unknown}
                  </Text>
                </InfoSection>

                <Divider />

                <InfoSection title={t.ingredients}>
                  {ingredients.length > 0 ? (
                    <View style={styles.chipRow}>
                      {ingredients.map((item, index) => (
                        <Chip key={`${item}-${index}`} style={styles.infoChip}>
                          {item}
                        </Chip>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.text}>{t.unknown}</Text>
                  )}
                </InfoSection>

                <Divider />

                <InfoSection title={t.allergens}>
                  {allergens.length > 0 ? (
                    <View style={styles.chipRow}>
                      {allergens.map((item, index) => (
                        <Chip key={`${item}-${index}`} style={styles.warningChip}>
                          {item}
                        </Chip>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.text}>{t.none}</Text>
                  )}
                </InfoSection>

                <Divider />

                <InfoSection title={t.spicyLevel}>
                  <Chip style={styles.infoChip}>
                    {mergedDish.spicy_level ?? 0} / 5
                  </Chip>
                </InfoSection>

                <Divider />
              </Card.Content>
            </Card>

            <Button
              mode="contained-tonal"
              icon="cart-plus"
              style={styles.addButton}
              contentStyle={styles.closeButtonContent}
              onPress={async () => {
                await addDishToCart(mergedDish, menuInfo);
                setSnackbarVisible(true);
              }}
            >
              {targetLang === "zh" ? "加入待点列表" : "Add to Order List"}
            </Button>

            <Button
              mode="contained"
              icon="close"
              style={styles.closeButton}
              contentStyle={styles.closeButtonContent}
              onPress={onClose}
            >
              {t.close}
            </Button>
          </ScrollView>

          <Snackbar
            visible={snackbarVisible}
            onDismiss={() => setSnackbarVisible(false)}
            duration={1600}
          >
            {targetLang === "zh" ? "已加入待点列表" : "Added to order list"}
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
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
  },
  heroCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    marginBottom: 16,
    overflow: "hidden",
  },
  dishImage: {
    width: "100%",
    height: 220,
    backgroundColor: "#EFE7DD",
  },
  detailCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontWeight: "800",
    color: "#1D1B20",
    marginBottom: 8,
  },
  original: {
    color: "#625B71",
    marginBottom: 14,
  },
  priceChip: {
    alignSelf: "flex-start",
    backgroundColor: "#E8DEF8",
  },
  priceText: {
    color: "#6750A4",
    fontWeight: "700",
  },
  loadingRow: {
    marginTop: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loadingText: {
    color: "#6750A4",
  },
  infoSection: {
    paddingVertical: 18,
  },
  sectionTitle: {
    fontWeight: "700",
    color: "#1D1B20",
    marginBottom: 10,
  },
  sectionContent: {
    marginTop: 2,
  },
  text: {
    color: "#625B71",
    lineHeight: 22,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  infoChip: {
    backgroundColor: "#F3EDF7",
  },
  warningChip: {
    backgroundColor: "#FCEEEE",
  },
  addButton: {
    borderRadius: 100,
    marginTop: 22,
  },
  closeButton: {
    borderRadius: 100,
    marginTop: 22,
  },
  closeButtonContent: {
    height: 54,
  },
  imagePlaceholder: {
    width: "100%",
    height: 220,
    backgroundColor: "#EFE7DD",
    position: "relative",
    overflow: "hidden",
  },

  defaultImageBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  defaultImageIcon: {
    fontSize: 42,
    marginBottom: 8,
  },

  defaultImageText: {
    color: "#625B71",
    fontWeight: "600",
  },

  imageLoadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.88)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  imageLoadingText: {
    color: "#6750A4",
    fontWeight: "700",
  },
});
