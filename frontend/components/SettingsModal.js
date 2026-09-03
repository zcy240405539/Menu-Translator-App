import React, { useState } from "react";
import { Alert, Linking, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  Appbar,
  Button,
  Divider,
  List,
  SegmentedButtons,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { getLanguageLabel, getText, LANGUAGES, saveLanguage } from "../i18n";
import { showAdPrivacyOptions } from "../utils/ads";
import LegalDocumentModal from "./LegalDocumentModal";

const PLAY_STORE_WEB_URL =
  "https://play.google.com/store/apps/details?id=com.agentscottystudio.aimenuapp";
const PLAY_STORE_APP_URL = "market://details?id=com.agentscottystudio.aimenuapp";
const APP_STORE_URL = "https://apps.apple.com/app/id6807476485";

export default function SettingsModal({
  visible,
  targetLang,
  currentUser,
  themeMode,
  onThemeModeChange,
  onTargetLangChange,
  onOpenAccount,
  onReplayOnboarding,
  onClose,
}) {
  const [legalKind, setLegalKind] = useState(null);
  const [languageExpanded, setLanguageExpanded] = useState(false);
  const theme = useTheme();
  const catalog = getText(targetLang);
  const text = catalog.settings;

  const openStore = async () => {
    const fallbackUrl = Platform.OS === "ios" ? APP_STORE_URL : PLAY_STORE_WEB_URL;
    const preferredUrl = Platform.OS === "android" ? PLAY_STORE_APP_URL : fallbackUrl;
    const supported = await Linking.canOpenURL(preferredUrl).catch(() => false);
    await Linking.openURL(supported ? preferredUrl : fallbackUrl);
  };

  const changeLanguage = (language) => {
    saveLanguage(language);
    onTargetLangChange(language);
    setLanguageExpanded(false);
  };

  const openAdPrivacy = async () => {
    try {
      await showAdPrivacyOptions();
    } catch (error) {
      Alert.alert(text.adPrivacy, text.adPrivacyUnavailable);
    }
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}>
          <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title={text.title} />
          </Appbar.Header>
          <ScrollView contentContainerStyle={styles.content}>
            <Text variant="titleMedium" style={styles.sectionTitle}>{text.general}</Text>
            <List.Item
              title={currentUser ? catalog.profile.title : catalog.auth.signInTitle}
              left={(props) => <List.Icon {...props} icon={currentUser ? "account-check" : "account-circle-outline"} />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                onClose();
                onOpenAccount();
              }}
            />
            <List.Accordion
              title={`${text.language}: ${getLanguageLabel(targetLang, targetLang)}`}
              left={(props) => <List.Icon {...props} icon="translate" />}
              expanded={languageExpanded}
              onPress={() => setLanguageExpanded((expanded) => !expanded)}
            >
              {LANGUAGES.map((language) => (
                <List.Item
                  key={language.code}
                  title={`${language.flag} ${getLanguageLabel(targetLang, language.code)}`}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={language.code === targetLang ? "check-circle" : "circle-outline"}
                    />
                  )}
                  onPress={() => changeLanguage(language.code)}
                />
              ))}
            </List.Accordion>

            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={styles.sectionTitle}>{text.appearance}</Text>
            <SegmentedButtons
              value={themeMode}
              onValueChange={onThemeModeChange}
              buttons={[
                { value: "system", label: text.system, icon: "theme-light-dark" },
                { value: "light", label: text.light, icon: "white-balance-sunny" },
                { value: "dark", label: text.dark, icon: "weather-night" },
              ]}
            />

            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={styles.sectionTitle}>{text.help}</Text>
            <List.Item
              title={text.replayTutorial}
              left={(props) => <List.Icon {...props} icon="compass-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                onClose();
                onReplayOnboarding();
              }}
            />
            <List.Item
              title={text.rateApp}
              left={(props) => <List.Icon {...props} icon="star-outline" />}
              right={(props) => <List.Icon {...props} icon="open-in-new" />}
              onPress={openStore}
            />
            {Platform.OS !== "web" && (
              <List.Item
                title={text.adPrivacy}
                left={(props) => <List.Icon {...props} icon="shield-account-outline" />}
                right={(props) => <List.Icon {...props} icon="chevron-right" />}
                onPress={openAdPrivacy}
              />
            )}

            <Divider style={styles.divider} />
            <Text variant="titleMedium" style={styles.sectionTitle}>{text.legal}</Text>
            <List.Item
              title={text.privacy}
              left={(props) => <List.Icon {...props} icon="shield-lock-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setLegalKind("privacy")}
            />
            <List.Item
              title={text.terms}
              left={(props) => <List.Icon {...props} icon="file-document-outline" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => setLegalKind("terms")}
            />

            <View style={styles.footer}>
              <Text style={{ color: theme.colors.onSurfaceVariant }}>{text.version}</Text>
              <Button mode="text" onPress={onClose}>{text.done}</Button>
            </View>
          </ScrollView>
        </Surface>
      </Modal>
      <LegalDocumentModal
        visible={Boolean(legalKind)}
        kind={legalKind}
        targetLang={targetLang}
        onClose={() => setLegalKind(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { width: "100%", maxWidth: 720, alignSelf: "center", padding: 20, paddingBottom: 40 },
  sectionTitle: { marginBottom: 12, fontWeight: "700" },
  divider: { marginVertical: 22 },
  footer: { marginTop: 28, alignItems: "center", gap: 8 },
});
