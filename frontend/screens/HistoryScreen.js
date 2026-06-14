import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function HistoryScreen({ onBack, onOpenMenu, targetLang, onOpenHistory, onOpenCart, onShare, currentUser, onOpenLogin, onOpenProfile, hasMenuResult, onBackToResult, onGoHome }) {
  const [history, setHistory] = useState([]);
  const isChinese = isChineseLanguage(targetLang);
  const isTraditional = targetLang === "zh-Hant";
  const insets = useSafeAreaInsets();

  const loadHistory = async () => {
    const data = await getMenuHistory();
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <Surface style={[styles.screen, { paddingBottom: insets.bottom }]}>
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        {hasMenuResult ? (
          <>
            <Appbar.Action icon="close" onPress={onBackToResult} />
            <Appbar.Action icon="home-outline" onPress={onGoHome} />
          </>
        ) : (
          <Appbar.BackAction onPress={onBack} />
        )}
        <Appbar.Content title={isChinese ? (isTraditional ? "歷史菜單" : "历史菜单") : "Menu History"} />
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
        contentContainerStyle={styles.content}
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card
            mode="elevated"
            style={styles.card}
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
  appbar: {
    backgroundColor: Platform.OS === 'web' ? 'transparent' : '#FDF8F3',
    elevation: 0,
    width: "100%",
    maxWidth: Platform.OS === 'web' ? 800 : '100%',
    alignSelf: "center",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    alignSelf: "center",
    width: "100%",
    maxWidth: 960,
  },
  card: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    marginBottom: 12,
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
