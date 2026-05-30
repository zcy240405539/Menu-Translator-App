import React, { useMemo, useState } from "react";
import { View, StyleSheet, SectionList } from "react-native";
import {
  Appbar,
  Card,
  Text,
  Surface,
  Chip,
  TouchableRipple,
} from "react-native-paper";

import DishDetailModal from "../components/DishDetailModal";
import { getText, isChineseLanguage } from "../i18n";
import { formatPrice } from "../utils/price";

function getTranslatedName(item) {
  return (
    item.translated_name ||
    item.translated_name_zh ||
    item.translated_name_en ||
    item.original_name
  );
}

function getTranslatedDescription(item) {
  return (
    item.description ||
    item.description_zh ||
    item.description_en ||
    ""
  );
}


function hasCjk(text) {
  return /[\u4e00-\u9fff]/.test(String(text || ""));
}

function isUsefulSectionTranslation(value, original, category, targetLang) {
  if (!value) return false;

  const v = String(value).trim();
  const o = String(original || "").trim();
  const c = String(category || "").trim();

  if (!v) return false;
  if (v === o || v === c) return false;

  if (isChineseLanguage(targetLang)) {
    return hasCjk(v);
  }

  return true;
}

function getSectionTitle(category, categoryItems, targetLang) {
  const bestTranslatedItem = categoryItems?.find((item) =>
    isUsefulSectionTranslation(
      item.section_heading_translated,
      item.section_heading_original,
      category,
      targetLang
    )
  );

  if (bestTranslatedItem?.section_heading_translated) {
    return bestTranslatedItem.section_heading_translated;
  }

  const bestDisplayItem = categoryItems?.find((item) =>
    isUsefulSectionTranslation(
      item.category_display_name,
      item.section_heading_original,
      category,
      targetLang
    )
  );

  if (bestDisplayItem?.category_display_name) {
    return bestDisplayItem.category_display_name;
  }

  const firstItem = categoryItems?.[0];

  return (
    firstItem?.section_heading_original ||
    category ||
    "Other"
  );
}

export default function MenuResultScreen({ menuResult, targetLang, onBack, onOpenCart }) {
  const [selectedDish, setSelectedDish] = useState(null);

  const lang = isChineseLanguage(targetLang) ? targetLang : "en";
  const t = getText(lang);

  let parsedResult = menuResult;

  if (typeof parsedResult === "string") {
    try {
      parsedResult = JSON.parse(parsedResult);
    } catch (e) {
      console.log("JSON parse failed:", e);
    }
  }

  const items =
    parsedResult?.menu_items ||
    parsedResult?.items ||
    parsedResult?.dishes ||
    [];
  const menuPricing = parsedResult?.menu_pricing || [];

  const sections = useMemo(() => {
    const groups = {};

    items.forEach((item) => {
      const category =
        item.section_heading_original ||
        item.category ||
        item.category_key ||
        "other";

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(item);
    });

    // 不再排序
    // 保持模型返回的视觉顺序

    return Object.keys(groups).map((category) => {
      const categoryItems = groups[category];

      return {
        key: category,
        title: getSectionTitle(category, categoryItems, targetLang),
        data: categoryItems,
      };
    });
  }, [items]);

  const restaurantType =
    parsedResult?.restaurant_type || t.result.restaurantFallback;

  const sourceLanguage =
    parsedResult?.source_language || t.result.sourceFallback;

  const openPricingDetail = (pricing) => {
    const detailText = [
      pricing.description,
      pricing.applies_to,
      pricing.details,
    ]
      .filter(Boolean)
      .join("\n\n");

    setSelectedDish({
      id: `pricing-${pricing.label}`,
      original_name: pricing.label,
      translated_name: pricing.label,
      price: pricing.price,
      description: detailText,
      ingredients: [],
      allergens: [],
      spicy_level: 0,
      cuisine: "Set Menu",
      image_url: null,
      source_language: sourceLanguage,
    });
  };
  
  const renderDish = ({ item }) => {
    const price = formatPrice(item.price, {
      sourceLanguage: item.source_language || sourceLanguage,
    });
    const displayName = getTranslatedName(item);
    const displayDescription = getTranslatedDescription(item);

    return (
      <TouchableRipple
        borderless
        style={styles.ripple}
        onPress={() => setSelectedDish(item)}
      >
        <Card mode="elevated" style={styles.dishCard}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.nameBox}>
                <Text variant="titleMedium" style={styles.name}>
                  {displayName}
                </Text>

                <Text variant="bodySmall" style={styles.originalName}>
                  {item.original_name || t.result.originalUnavailable}
                </Text>
              </View>

              {!!price && (
                <Chip compact style={styles.priceChip} textStyle={styles.priceText}>
                  {price}
                </Chip>
              )}
            </View>

            {!!displayDescription && (
              <Text variant="bodyMedium" style={styles.description} numberOfLines={2}>
                {displayDescription}
              </Text>
            )}
          </Card.Content>
        </Card>
      </TouchableRipple>
    );
  };

  return (
    <Surface style={styles.screen}>
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={t.result.title} />
        <Appbar.Action icon="cart-outline" onPress={onOpenCart} />
      </Appbar.Header>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id?.toString() || String(index)}
        renderItem={renderDish}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <Card mode="elevated" style={styles.summaryCard}>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.summaryTitle}>
                  {t.result.title}
                </Text>

                <Text variant="bodyMedium" style={styles.summarySubtitle}>
                  {restaurantType} · {sourceLanguage} · {items.length} {t.result.items}
                </Text>
              </Card.Content>
            </Card>
          </>
        }                           
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              {section.title}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <Card mode="outlined" style={styles.emptyCard}>
            <Card.Content>
              <Text style={styles.emptyText}>{t.result.empty}</Text>
            </Card.Content>
          </Card>
        }
        ListFooterComponent={
          <>
            {menuPricing.map((pricing, index) => (
              <TouchableRipple
                key={`pricing-${index}`}
                borderless
                style={styles.ripple}
                onPress={() => openPricingDetail(pricing)}
              >
                <Card mode="elevated" style={styles.pricingCard}>
                  <Card.Content>
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>{pricing.label}</Text>

                      {!!pricing.price && (
                        <Chip compact style={styles.priceChip} textStyle={styles.priceText}>
                          {formatPrice(pricing.price, { sourceLanguage })}
                        </Chip>
                      )}
                    </View>

                    {!!pricing.description && (
                      <Text style={styles.pricingDescription}>{pricing.description}</Text>
                    )}

                    {!!pricing.applies_to && (
                      <Text style={styles.pricingApplies}>{pricing.applies_to}</Text>
                    )}
                  </Card.Content>
                </Card>
              </TouchableRipple>
            ))}
          </>
        }
      />

      <DishDetailModal
        visible={!!selectedDish}
        dish={selectedDish}
        targetLang={targetLang}
        onClose={() => setSelectedDish(null)}
        menuInfo={{
          restaurant_type: restaurantType,
          source_language: sourceLanguage,
        }}
      />
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  summaryCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    marginBottom: 18,
  },
  summaryTitle: {
    fontWeight: "700",
    color: "#1D1B20",
    marginBottom: 6,
  },
  summarySubtitle: {
    color: "#625B71",
  },
  sectionHeader: {
    marginTop: 12,
    marginBottom: 10,
  },
  sectionTitle: {
    fontWeight: "800",
    color: "#1D1B20",
  },
  ripple: {
    borderRadius: 22,
    marginBottom: 12,
  },
  dishCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  nameBox: {
    flex: 1,
  },
  name: {
    fontWeight: "700",
    color: "#1D1B20",
  },
  originalName: {
    color: "#79747E",
    marginTop: 4,
    fontStyle: "italic",
  },
  priceChip: {
    backgroundColor: "#E8DEF8",
  },
  priceText: {
    color: "#6750A4",
    fontWeight: "700",
  },
  description: {
    marginTop: 12,
    color: "#625B71",
    lineHeight: 21,
  },
  emptyCard: {
    borderRadius: 22,
    marginTop: 20,
  },
  emptyText: {
    color: "#625B71",
    textAlign: "center",
  },
  pricingCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    marginBottom: 18,
  },

  pricingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  pricingTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1D1B20",
    flex: 1,
  },

  pricingDescription: {
    marginTop: 10,
    color: "#625B71",
    lineHeight: 20,
  },

  pricingApplies: {
    marginTop: 8,
    color: "#6750A4",
    fontWeight: "600",
  },
});
