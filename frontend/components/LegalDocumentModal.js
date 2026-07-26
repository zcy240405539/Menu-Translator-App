import React from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Surface, Text, useTheme } from "react-native-paper";
import { getLegalContent } from "../legalContent";

export default function LegalDocumentModal({ visible, kind, targetLang, onClose }) {
  const theme = useTheme();
  const legal = getLegalContent(targetLang);
  const document = legal[kind];

  if (!document) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
          <Appbar.BackAction onPress={onClose} />
          <Appbar.Content title={document.title} />
        </Appbar.Header>
        <ScrollView contentContainerStyle={styles.content}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            {legal.common.brand}
          </Text>
          <Text variant="headlineMedium" style={styles.title}>{document.title}</Text>
          <Text style={styles.intro}>{document.intro}</Text>
          {document.sections.map((section) => (
            <View key={section.heading} style={styles.section}>
              <Text variant="titleLarge" style={styles.heading}>{section.heading}</Text>
              {section.items.map((item) => (
                <View key={item} style={styles.item}>
                  <Text style={{ color: theme.colors.primary }}>•</Text>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
          <Text style={[styles.contact, { color: theme.colors.onSurfaceVariant }]}>
            {legal.common.contact}: support@aimenu.us.kg
          </Text>
        </ScrollView>
      </Surface>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 24, paddingBottom: 48 },
  title: { marginTop: 10, fontWeight: "800" },
  intro: { marginTop: 22, fontSize: 16, lineHeight: 25 },
  section: { marginTop: 28 },
  heading: { marginBottom: 10, fontWeight: "700" },
  item: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 10 },
  itemText: { flex: 1, fontSize: 15, lineHeight: 23 },
  contact: { marginTop: 30, fontSize: 14 },
});
