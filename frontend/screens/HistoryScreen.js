import React, { useEffect, useState } from "react";
import { StyleSheet, FlatList, Platform, useWindowDimensions, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import {
  Appbar,
  Card,
  Text,
  Surface,
  Button,
  Chip,
} from "react-native-paper";

import {
  getMenuHistory,
  clearMenuHistory,
} from "../storage/menuStorage";
import { isChineseLanguage } from "../i18n";


const pickFile = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
  });

  if (!result.canceled) {
    const file = result.assets[0];

    setSelectedFile({
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType,
    });
  }
};

export default function HistoryScreen({ onBack, onOpenMenu, targetLang, onOpenHistory, onOpenCart, onShare, currentUser, onOpenLogin, onOpenProfile }) {
  const [history, setHistory] = useState([]);
  const isChinese = isChineseLanguage(targetLang);
  const isTraditional = targetLang === "zh-Hant";
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopLayout = isWeb && width >= 900;
  const shouldHideAppTitle = isWeb && (width < 520 || height < 560);
  const columnCount = isDesktopLayout && width >= 1280 ? 3 : isDesktopLayout ? 2 : 1;

  const loadHistory = async () => {
    const data = await getMenuHistory();
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <Surface style={[styles.screen, isDesktopLayout && styles.screenDesktop]}>
      <Appbar.Header mode="center-aligned" style={[styles.appbar, isDesktopLayout && styles.appbarDesktop]}>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={shouldHideAppTitle ? "" : isChinese ? (isTraditional ? "歷史菜單" : "历史菜单") : "Menu History"} />
        <Appbar.Action icon="share-variant" onPress={() => onShare && onShare(null, isChinese ? "分享菜单翻译助手历史记录并体验翻译！" : "Check out Menu Translator menu history!")} />
        <Appbar.Action icon="history" onPress={onOpenHistory} />
        <Appbar.Action icon="cart-outline" onPress={onOpenCart} />
        <Appbar.Action
          icon="delete-outline"
          onPress={async () => {
            await clearMenuHistory();
            setHistory([]);
          }}
        />
        <Appbar.Action icon={currentUser ? "account-check" : "account-circle-outline"} onPress={() => currentUser ? onOpenProfile() : onOpenLogin()} />
      </Appbar.Header>

      <FlatList
        key={`history-${columnCount}`}
        contentContainerStyle={[styles.content, isDesktopLayout && styles.contentDesktop]}
        data={history}
        numColumns={columnCount}
        columnWrapperStyle={columnCount > 1 ? styles.gridRow : undefined}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.gridItem}>
            <Card
              mode="elevated"
              style={[styles.card, isDesktopLayout && styles.cardDesktop]}
              onPress={() => onOpenMenu(item)}
            >
              <Card.Content>
                <Text variant="titleMedium" style={styles.title}>
                  {item.business_name || item.restaurant_type || "Restaurant"}
                </Text>

                <Text style={styles.subtitle}>
                  {item.source_language} · {item.menu_items?.length || 0}{" "}
                  {isChinese ? "道菜" : "items"}
                </Text>

                <Text style={styles.date}>
                  {new Date(item.createdAt).toLocaleString()}
                </Text>

                <Chip style={styles.chip}>
                  {isChinese ? (isTraditional ? "點擊開啟" : "点击打开") : "Tap to open"}
                </Chip>
              </Card.Content>
            </Card>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {isChinese ? (isTraditional ? "暫無歷史菜單" : "暂无历史菜单") : "No menu history yet"}
          </Text>
        }
      />
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
    padding: 16,
    paddingBottom: 32,
  },
  contentDesktop: {
    width: "100%",
    maxWidth: 1280,
    alignSelf: "center",
    paddingHorizontal: 32,
    paddingTop: 24,
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
  },
  cardDesktop: {
    borderRadius: 8,
    minHeight: 154,
    height: "100%",
    marginBottom: 0,
  },
  gridRow: {
    gap: 16,
    marginBottom: 16,
  },
  gridItem: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 6,
    color: "#625B71",
  },
  date: {
    marginTop: 6,
    color: "#79747E",
  },
  chip: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: "#E8DEF8",
  },
  empty: {
    marginTop: 32,
    textAlign: "center",
    color: "#625B71",
  },
});
