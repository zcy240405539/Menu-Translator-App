import React, { useMemo, useState, useEffect } from "react";
import { View, StyleSheet, SectionList, Platform, useWindowDimensions } from "react-native";
import {
  Appbar,
  Card,
  Text,
  Surface,
  Chip,
  TouchableRipple,
  Button,
} from "react-native-paper";

import DishDetailModal from "../components/DishDetailModal";
import AIRecommendModal from "../components/AIRecommendModal";
import { getText, isChineseLanguage, getUrlLangParam } from "../i18n";
import { formatPrice } from "../utils/price";
import { BannerAd, BannerAdSize, AD_UNIT_IDS } from "../utils/ads";

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

function chunkItems(items, size) {
  const rows = [];
  for (let index = 0; index < items.length; index += size) {
    rows.push(items.slice(index, index + size));
  }
  return rows;
}

export default function MenuResultScreen({ menuResult, targetLang, onBack, onOpenCart, onOpenHistory, onShare, currentUser, onOpenLogin, onOpenProfile }) {
  const [selectedDish, setSelectedDish] = useState(null);
  const [showRecommend, setShowRecommend] = useState(false);
  const [cameFromRecommend, setCameFromRecommend] = useState(false);

  const handleShare = () => {
    if (onShare) {
      const hash = parsedResult?.image_hash || "";
      const baseUrl = "https://ai-menu-app.onrender.com";
      const langParam = getUrlLangParam(targetLang);
      let shareUrl = hash ? `${baseUrl}/?menu_hash=${hash}&lang=${langParam}` : baseUrl;
      
      if (selectedDish) {
        shareUrl += `&dish_name=${encodeURIComponent(selectedDish.original_name || selectedDish.translated_name || selectedDish.name)}`;
        if (cameFromRecommend) {
          shareUrl += `&show_recommend=1`;
        }
      } else if (showRecommend) {
        shareUrl += `&show_recommend=1`;
      }
      
      onShare(shareUrl, t.home?.shareMessage || "Check out this menu translator result!");
    }
  };

  const lang = isChineseLanguage(targetLang) ? targetLang : "en";
  const t = getText(lang);
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopLayout = isWeb && width >= 900;
  const shouldHideAppTitle = isWeb && (width < 520 || height < 560);
  const desktopColumnCount = isDesktopLayout && width >= 1280 ? 3 : 2;

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

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const isRecommend = params.get("show_recommend") === "1";
      const dishName = params.get("dish_name");

      if (isRecommend) {
        if (dishName) {
          setCameFromRecommend(true);
        } else {
          setShowRecommend(true);
        }
      }

      if (dishName) {
        const decodedName = decodeURIComponent(dishName);
        const found = items.find(
          (x) =>
            x.original_name === decodedName ||
            x.translated_name === decodedName ||
            x.name === decodedName
        );
        if (found) {
          setSelectedDish(found);
        }
      }
    }
  }, [items, targetLang]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.location || !window.history?.replaceState) return;

    const url = new URL(window.location.href);

    if (url.searchParams.has("menu_hash")) {
      if (selectedDish) {
        const dishName = selectedDish.original_name || selectedDish.translated_name || selectedDish.name || "";
        url.searchParams.set("dish_name", dishName);
        if (cameFromRecommend) {
          url.searchParams.set("show_recommend", "1");
        } else {
          url.searchParams.delete("show_recommend");
        }
      } else if (showRecommend) {
        url.searchParams.set("show_recommend", "1");
        url.searchParams.delete("dish_name");
      } else {
        url.searchParams.delete("show_recommend");
        url.searchParams.delete("dish_name");
      }

      url.searchParams.set("lang", getUrlLangParam(targetLang));

      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, [showRecommend, selectedDish, targetLang, cameFromRecommend]);

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

  const displaySections = useMemo(() => {
    if (!isDesktopLayout) {
      return sections;
    }

    return sections.map((section) => ({
      ...section,
      data: chunkItems(section.data, desktopColumnCount),
    }));
  }, [sections, isDesktopLayout, desktopColumnCount]);

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
  
  const renderDishCard = (item) => {
    const price = formatPrice(item.price, {
      sourceLanguage: item.source_language || sourceLanguage,
      currency: parsedResult?.currency,
      targetLanguage: targetLang,
    });
    const displayName = getTranslatedName(item);
    const displayDescription = getTranslatedDescription(item);

    return (
      <TouchableRipple
        borderless
        style={[styles.ripple, isDesktopLayout && styles.rippleDesktop]}
        onPress={() => setSelectedDish(item)}
      >
        <Card mode="elevated" style={[styles.dishCard, isDesktopLayout && styles.dishCardDesktop]}>
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

  const renderDish = ({ item }) => {
    if (!isDesktopLayout) {
      return renderDishCard(item);
    }

    const fillers = Array.from({ length: Math.max(0, desktopColumnCount - item.length) });

    return (
      <View style={styles.desktopGridRow}>
        {item.map((dish) => (
          <View key={dish.id?.toString() || dish.original_name || dish.translated_name} style={styles.desktopGridCell}>
            {renderDishCard(dish)}
          </View>
        ))}
        {fillers.map((_, index) => (
          <View key={`empty-${index}`} style={styles.desktopGridCell} />
        ))}
      </View>
    );
  };

  return (
    <Surface style={[styles.screen, isDesktopLayout && styles.screenDesktop]}>
      <Appbar.Header mode="center-aligned" style={[styles.appbar, isDesktopLayout && styles.appbarDesktop]}>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={shouldHideAppTitle ? "" : t.result.title} />
        <Appbar.Action icon="share-variant" onPress={handleShare} />
        <Appbar.Action icon="history" onPress={onOpenHistory} />
        <Appbar.Action icon="cart-outline" onPress={onOpenCart} />
        <Appbar.Action icon={currentUser ? "account-check" : "account-circle-outline"} onPress={() => currentUser ? onOpenProfile() : onOpenLogin()} />
      </Appbar.Header>

      <SectionList
        sections={displaySections}
        keyExtractor={(item, index) => Array.isArray(item) ? item.map((dish) => dish.id || dish.original_name || dish.translated_name).join("-") || String(index) : item.id?.toString() || String(index)}
        renderItem={renderDish}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          isDesktopLayout && styles.listContentDesktop,
        ]}
        ListHeaderComponent={
          <>
            <Card mode={isDesktopLayout ? "outlined" : "elevated"} style={[styles.summaryCard, isDesktopLayout && styles.summaryCardDesktop]}>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.summaryTitle}>
                  {parsedResult?.business_name || t.result.title}
                </Text>

                <Text variant="bodyMedium" style={styles.summarySubtitle}>
                  {restaurantType} · {sourceLanguage} · {items.length} {t.result.items}
                </Text>

                <Button
                  mode="contained"
                  icon="brain"
                  onPress={() => setShowRecommend(true)}
                  style={styles.recommendBtn}
                >
                  {t.result.aiRecommendBtn || "AI智能推荐"}
                </Button>
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
          <View style={isDesktopLayout && styles.footerGrid}>
            {menuPricing.map((pricing, index) => (
              <TouchableRipple
                key={`pricing-${index}`}
                borderless
                style={[styles.ripple, isDesktopLayout && styles.footerGridCell]}
                onPress={() => openPricingDetail(pricing)}
              >
                <Card mode="elevated" style={[styles.pricingCard, isDesktopLayout && styles.pricingCardDesktop]}>
                  <Card.Content>
                    <View style={styles.pricingHeader}>
                      <Text style={styles.pricingTitle}>{pricing.label}</Text>

                      {!!pricing.price && (
                        <Chip compact style={styles.priceChip} textStyle={styles.priceText}>
                          {formatPrice(pricing.price, {
                            sourceLanguage,
                            currency: parsedResult?.currency,
                            targetLanguage: targetLang,
                          })}
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
          </View>
        }
      />

      <AIRecommendModal
        visible={showRecommend}
        menuItems={items}
        targetLang={targetLang}
        onClose={() => setShowRecommend(false)}
        onPressDish={(dish) => {
          setCameFromRecommend(true);
          setShowRecommend(false);
          setSelectedDish(dish);
        }}
        onOpenHistory={onOpenHistory}
        onOpenCart={onOpenCart}
        onShare={handleShare}
        menuHash={parsedResult?.image_hash || ""}
        menuInfo={{
          restaurant_type: restaurantType,
          source_language: sourceLanguage,
          currency: parsedResult?.currency,
        }}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenProfile={onOpenProfile}
      />

      <DishDetailModal
        visible={!!selectedDish}
        dish={selectedDish}
        targetLang={targetLang}
        onClose={() => {
          setSelectedDish(null);
          if (cameFromRecommend) {
            setShowRecommend(true);
            setCameFromRecommend(false);
          }
        }}
        onOpenHistory={onOpenHistory}
        onOpenCart={onOpenCart}
        onShare={handleShare}
        menuHash={parsedResult?.image_hash || ""}
        menuInfo={{
          restaurant_type: restaurantType,
          source_language: sourceLanguage,
          currency: parsedResult?.currency,
        }}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenProfile={onOpenProfile}
      />
      {BannerAd && (
        <View style={styles.adContainer}>
          <BannerAd
            unitId={AD_UNIT_IDS.bottomBanner}
            size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
          />
        </View>
      )}
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
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  listContentDesktop: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 48,
  },
  summaryCard: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    marginTop: 10,
    marginBottom: 18,
  },
  summaryCardDesktop: {
    borderRadius: 8,
    marginTop: 0,
    borderColor: "#E7E0EC",
  },
  recommendBtn: {
    marginTop: 12,
    borderRadius: 100,
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
  rippleDesktop: {
    borderRadius: 8,
    marginBottom: 0,
    height: "100%",
  },
  dishCard: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  dishCardDesktop: {
    borderRadius: 8,
    minHeight: 150,
    height: "100%",
  },
  desktopGridRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  desktopGridCell: {
    flex: 1,
    minWidth: 0,
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
  pricingCardDesktop: {
    borderRadius: 8,
    minHeight: 132,
    height: "100%",
  },
  footerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  footerGridCell: {
    flexBasis: "31.9%",
    flexGrow: 1,
    minWidth: 280,
    borderRadius: 8,
    marginBottom: 0,
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
  adContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    backgroundColor: "#FDF8F3",
  },
});
