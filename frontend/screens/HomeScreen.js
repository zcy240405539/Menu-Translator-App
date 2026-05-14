import React, { useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";
import { saveMenuHistory } from "../storage/menuStorage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  Appbar,
  Button,
  Card,
  Text,
  Surface,
  Menu,
  ActivityIndicator,
} from "react-native-paper";

import { parseMenuFile } from "../api";
import { getText } from "../i18n";

export default function HomeScreen({ targetLang, setTargetLang, onMenuParsed, onOpenCart, onOpenHistory }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [langMenuVisible, setLangMenuVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const lang = targetLang === "zh" ? "zh" : "en";
  const t = getText(lang);

  const takePicture = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(t.home.permissionRequired, t.home.cameraPermission);
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.4,
      allowsEditing: false,
      base64: false,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

const compressImage = async (uri) => {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [
        {
          resize: {
            width: 1000,
          },
        },
      ],
      {
        compress: 0.55,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return result.uri;
  } catch (err) {
    console.log("Image compression failed:", err);
    return uri;
  }
};

const selectFromFile = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return;
    }

    const file = result.assets[0];

    setSelectedFile({
      uri: file.uri,
      name: file.name || "menu",
      mimeType: file.mimeType || "application/octet-stream",
    });

    setImageUri(file.uri);
  } catch (error) {
    Alert.alert("File selection failed", error.message || "Unknown error");
  }
};

  const handleParse = async () => {
    if (!imageUri) {
      Alert.alert(t.home.noImageTitle, t.home.noImageMessage);
      return;
    }

    try {
      setLoading(true);

      const isPdf =
        selectedFile?.mimeType === "application/pdf" ||
        selectedFile?.name?.toLowerCase().endsWith(".pdf");

      let fileToUpload;

      if (isPdf) {
        fileToUpload = selectedFile;
      } else {
        const originalUri = selectedFile?.uri || imageUri;
        const compressedUri = await compressImage(originalUri);

        fileToUpload = {
          uri: compressedUri,
          name: "menu_compressed.jpg",
          mimeType: "image/jpeg",
        };
      }

      const data = await parseMenuFile(fileToUpload, targetLang);

      await saveMenuHistory(data, imageUri, targetLang);
      onMenuParsed(data);
    } catch (error) {
      console.warn("Menu analysis failed:", error);
      Alert.alert(
        t.home.analysisFailed,
        error.message || JSON.stringify(error)
      );
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    console.log("Share pressed");
  };

  const handleLogin = () => {
    console.log("Login pressed");
  };

  const currentLangLabel =
    targetLang === "zh" ? "🇨🇳 中文" : "🇺🇸 English";

  return (
    <Surface style={styles.screen}>
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        <Appbar.Content title={t.appTitle} />

        <Menu
          visible={langMenuVisible}
          onDismiss={() => setLangMenuVisible(false)}
          anchor={
            <Appbar.Action
              icon="translate"
              onPress={() => setLangMenuVisible(true)}
            />
          }
        >
          <Menu.Item
            title={`🇺🇸 ${t.home.english}`}
            onPress={() => {
              setTargetLang("en");
              setLangMenuVisible(false);
            }}
          />
          <Menu.Item
            title={`🇨🇳 ${t.home.chinese}`}
            onPress={() => {
              setTargetLang("zh");
              setLangMenuVisible(false);
            }}
          />
        </Menu>

        <Appbar.Action icon="share-variant" onPress={handleShare} />
        <Appbar.Action icon="history" onPress={onOpenHistory} />
        <Appbar.Action icon="cart-outline" onPress={onOpenCart} />
        <Appbar.Action icon="account-circle-outline" onPress={handleLogin} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Card mode="elevated" style={styles.card}>
          <Card.Content>
            <Text variant="headlineMedium" style={styles.title}>
              {t.home.heroTitle}
            </Text>

            <Text variant="bodyMedium" style={styles.subtitle}>
              {t.home.heroSubtitle}
            </Text>

            <Text style={styles.langText}>
              {t.home.targetLanguage}: {currentLangLabel}
            </Text>

            <Button
              mode="contained"
              icon="camera-outline"
              style={styles.button}
              contentStyle={styles.buttonContent}
              onPress={takePicture}
              disabled={loading}
            >
              {t.home.takePicture}
            </Button>

            <Button
              mode="outlined"
              icon="file-image-outline"
              style={styles.outlineButton}
              contentStyle={styles.buttonContent}
              onPress={selectFromFile}
              disabled={loading}
            >
              {t.home.selectFromFile}
            </Button>

            {imageUri && (
              <View style={styles.previewSection}>
                <Text variant="titleMedium" style={styles.previewTitle}>
                  {t.home.selectedMenu}
                </Text>

                <Image source={{ uri: imageUri }} style={styles.preview} />

                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" />
                    <Text style={styles.loadingText}>
                      {t.home.analyzingMenu}
                    </Text>
                  </View>
                ) : (
                  <Button
                    mode="contained-tonal"
                    icon="magic-staff"
                    style={styles.analyzeButton}
                    contentStyle={styles.buttonContent}
                    onPress={handleParse}
                  >
                    {t.home.analyzeMenu}
                  </Button>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      </ScrollView>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  card: {
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    paddingVertical: 22,
  },
  title: {
    textAlign: "center",
    fontWeight: "700",
    color: "#1D1B20",
    marginBottom: 10,
  },
  subtitle: {
    textAlign: "center",
    color: "#625B71",
    lineHeight: 22,
    marginBottom: 16,
  },
  langText: {
    textAlign: "center",
    color: "#6750A4",
    marginBottom: 24,
    fontWeight: "600",
  },
  button: {
    borderRadius: 100,
    marginBottom: 14,
  },
  outlineButton: {
    borderRadius: 100,
    marginBottom: 10,
  },
  analyzeButton: {
    borderRadius: 100,
    marginTop: 16,
  },
  buttonContent: {
    height: 54,
  },
  previewSection: {
    marginTop: 22,
  },
  previewTitle: {
    marginBottom: 10,
    fontWeight: "700",
    color: "#1D1B20",
  },
  preview: {
    width: "100%",
    height: 280,
    resizeMode: "contain",
    borderRadius: 18,
    backgroundColor: "#E7E0EC",
  },
  loadingBox: {
    marginTop: 18,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#625B71",
  },
});