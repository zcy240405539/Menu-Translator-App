import React, { useEffect, useState } from "react";
import { StyleSheet, FlatList, View } from "react-native";
import {
  Card,
  Text,
  Surface,
  Chip,
  IconButton,
  useTheme,
} from "react-native-paper";

import {
  getMenuHistory,
  clearMenuHistory,
} from "../storage/menuStorage";
import { getText } from "../i18n";
import FloatingToolbar from "../components/FloatingToolbar";

export default function HistoryScreen({ onBack, onOpenMenu, targetLang, onOpenHistory, onOpenCart, onShare, onGoHome, onOpenSettings }) {
  const [history, setHistory] = useState([]);
  const t = getText(targetLang);
  const theme = useTheme();

  const loadHistory = async () => {
    const data = await getMenuHistory();
    setHistory(data);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  return (
    <Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <FlatList
        contentContainerStyle={styles.content}
        data={history}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={(
          <View style={styles.pageHeader}>
            <Text variant="headlineSmall" style={[styles.pageTitle, { color: theme.colors.onSurface }]}>{t.history.title}</Text>
            <IconButton
              icon="delete-outline"
              accessibilityLabel={t.history.clear}
              onPress={async () => {
                await clearMenuHistory();
                setHistory([]);
              }}
            />
          </View>
        )}
        renderItem={({ item }) => (
          <Card
            mode="elevated"
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
            onPress={() => onOpenMenu(item)}
          >
            <Card.Content>
              <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onSurface }]}>
                {item.business_name || item.restaurant_type || t.common.restaurantFallback}
              </Text>

              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                {item.source_language} · {item.menu_items?.length || 0}{" "}
                {t.history.items}
              </Text>

              <Text style={[styles.date, { color: theme.colors.onSurfaceVariant }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>

              <Chip style={styles.chip}>
                {t.history.open}
              </Chip>
            </Card.Content>
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.colors.onSurfaceVariant }]}>
            {t.history.empty}
          </Text>
        }
      />
      <FloatingToolbar
        activeKey="history"
        targetLang={targetLang}
        onGoHome={onGoHome || onBack}
        onShare={() => onShare && onShare(null, t.history.shareMessage)}
        onOpenHistory={onOpenHistory}
        onOpenCart={onOpenCart}
        onOpenPreferences={onOpenSettings}
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF8F3",
  },
  content: {
    padding: 16,
    paddingBottom: 32,
    alignSelf: "center",
    width: "100%",
    maxWidth: 960,
  },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  pageTitle: {
    fontWeight: "800",
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
