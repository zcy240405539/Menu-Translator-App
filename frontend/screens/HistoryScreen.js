import React, { useEffect, useState } from "react";
import { StyleSheet, FlatList } from "react-native";
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

export default function HistoryScreen({ onBack, onOpenMenu, targetLang }) {
  const [history, setHistory] = useState([]);

  const loadHistory = async () => {
    const data = await getMenuHistory();
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <Surface style={styles.screen}>
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        <Appbar.BackAction onPress={onBack} />
        <Appbar.Content title={targetLang === "zh" ? "历史菜单" : "Menu History"} />
        <Appbar.Action
          icon="delete-outline"
          onPress={async () => {
            await clearMenuHistory();
            setHistory([]);
          }}
        />
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
                {item.restaurant_type || "Restaurant"}
              </Text>

              <Text style={styles.subtitle}>
                {item.source_language} · {item.menu_items?.length || 0}{" "}
                {targetLang === "zh" ? "道菜" : "items"}
              </Text>

              <Text style={styles.date}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>

              <Chip style={styles.chip}>
                {targetLang === "zh" ? "点击打开" : "Tap to open"}
              </Chip>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {targetLang === "zh" ? "暂无历史菜单" : "No menu history yet"}
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
    backgroundColor: "#FDF8F3",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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