import React, { useEffect, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  Share,
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
  Portal,
  Dialog,
  TextInput,
} from "react-native-paper";

import { parseMenuFile, parseMenuUrl } from "../api";
import { InterstitialAd, AdEventType, AD_UNIT_IDS } from "../utils/ads";
import {
  getText,
  saveLanguage,
  LANGUAGES,
  SOURCE_LANGUAGES,
} from "../i18n";


const DOCUMENT_PICKER_TYPES = [
  "image/*",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/html",
  "text/plain",
  "text/csv",
  "application/json",
];

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif"];

export default function HomeScreen({ targetLang, setTargetLang, onMenuParsed, onOpenCart, onOpenHistory, onShare, currentUser, onOpenLogin, onOpenProfile, initialMenuUrl }) {
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [sourceLangMenuVisible, setSourceLangMenuVisible] = useState(false);
  const [targetLangMenuVisible, setTargetLangMenuVisible] = useState(false);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [menuUrl, setMenuUrl] = useState("");

  const lang = targetLang;
  const t = getText(lang);

  useEffect(() => {
    if (initialMenuUrl) {
      setMenuUrl(initialMenuUrl);
    }
  }, [initialMenuUrl]);

  // source and target languages should not be the same
  const getSafeTargetLang = (langCode) => {
    if (!langCode || langCode === "auto") {
      return "en";
    }

    return langCode;
  };

  const handleSourceLanguageChange = (newSourceLang) => {
    if (newSourceLang === targetLang) {
      const previousSourceLang = sourceLang;

      setSourceLang(newSourceLang);

      const newTargetLang = getSafeTargetLang(previousSourceLang);
      setTargetLang(newTargetLang);
      saveLanguage(newTargetLang);

      return;
    }

    setSourceLang(newSourceLang);
  };

  const handleTargetLanguageChange = (newTargetLang) => {
    if (newTargetLang === sourceLang) {
      const previousTargetLang = targetLang;

      setTargetLang(newTargetLang);
      saveLanguage(newTargetLang);

      setSourceLang(previousTargetLang);

      return;
    }

    setTargetLang(newTargetLang);
    saveLanguage(newTargetLang);
  };  

  const getSourceLanguageLabel = (item) => {
    if (!item) return "";
    return item.code === "auto" ? t.home.autoDetect : item.label;
  };

  const isImageFile = (file) => {
    const mimeType = (file?.mimeType || file?.type || "").toLowerCase();
    if (mimeType.startsWith("image/")) {
      return true;
    }

    const fileName = (file?.name || file?.uri || "").toLowerCase();
    return IMAGE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
  };

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
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: "camera-menu.jpg",
        mimeType: "image/jpeg",
      });
      setImageUri(asset.uri);
      setMenuUrl("");
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
        compress: 0.85,
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
      type: DOCUMENT_PICKER_TYPES,
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
    setMenuUrl("");
  } catch (error) {
    Alert.alert(t.home.fileSelectionFailed, error.message || t.home.unknownError);
  }
};

  const runMenuAnalysis = async (parseAction, historySource) => {
    let adShown = false;
    let parseResult = null;
    let parseError = null;
    let adClosed = false;

    try {
      setLoading(true);

      const navigateToResult = async (data) => {
        try {
          await saveMenuHistory(data, historySource || imageUri || menuUrl, targetLang);
          onMenuParsed(data);
        } catch (err) {
          console.warn("Save history failed:", err);
          onMenuParsed(data);
        }
      };

      // 1. Start Menu Parsing in background
      parseAction()
        .then((data) => {
          parseResult = data;
          if (!adShown || adClosed) {
            navigateToResult(data);
            setLoading(false);
          }
        })
        .catch((err) => {
          parseError = err;
          if (!adShown || adClosed) {
            console.warn("Menu analysis failed:", err);
            Alert.alert(t.home.analysisFailed, err.message || JSON.stringify(err));
            setLoading(false);
          }
        });

      // 2. Start Loading Ad (if on native platform and InterstitialAd is available)
      if (Platform.OS !== "web" && InterstitialAd) {
        const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
        
        let adTimeout = setTimeout(() => {
          if (!adShown) {
            adClosed = true;
            if (parseResult) {
              navigateToResult(parseResult);
              setLoading(false);
            } else if (parseError) {
              console.warn("Menu analysis failed:", parseError);
              Alert.alert(t.home.analysisFailed, parseError.message || JSON.stringify(parseError));
              setLoading(false);
            }
          }
        }, 3500); // Wait up to 3.5 seconds for ad to load

        interstitial.addAdEventListener(AdEventType.LOADED, () => {
          clearTimeout(adTimeout);
          adShown = true;
          interstitial.show().catch((err) => {
            console.warn("Failed to show interstitial ad:", err);
            adClosed = true;
            if (parseResult) {
              navigateToResult(parseResult);
              setLoading(false);
            } else if (parseError) {
              Alert.alert(t.home.analysisFailed, parseError.message || JSON.stringify(parseError));
              setLoading(false);
            }
          });
        });

        interstitial.addAdEventListener(AdEventType.CLOSED, () => {
          adClosed = true;
          if (parseResult) {
            navigateToResult(parseResult);
            setLoading(false);
          } else if (parseError) {
            Alert.alert(t.home.analysisFailed, parseError.message || JSON.stringify(parseError));
            setLoading(false);
          }
        });

        interstitial.addAdEventListener(AdEventType.ERROR, (err) => {
          console.warn("Interstitial ad error:", err);
          clearTimeout(adTimeout);
          adClosed = true;
          if (parseResult) {
            navigateToResult(parseResult);
            setLoading(false);
          } else if (parseError) {
            Alert.alert(t.home.analysisFailed, parseError.message || JSON.stringify(parseError));
            setLoading(false);
          }
        });

        interstitial.load();
      } else {
        adClosed = true;
      }

    } catch (error) {
      console.warn("Menu analysis initialization failed:", error);
      Alert.alert(
        t.home.analysisFailed,
        error.message || JSON.stringify(error)
      );
      setLoading(false);
    }
  };

  const handleParse = async () => {
    if (!selectedFile && !imageUri) {
      Alert.alert(t.home.noMenuTitle, t.home.noMenuMessage);
      return;
    }

    const sourceFile = selectedFile || {
      uri: imageUri,
      name: "menu.jpg",
      mimeType: "image/jpeg",
    };

    let fileToUpload = sourceFile;
    if (isImageFile(sourceFile)) {
      const compressedUri = await compressImage(sourceFile.uri);
      fileToUpload = {
        uri: compressedUri,
        name: "menu_compressed.jpg",
        mimeType: "image/jpeg",
      };
    }

    return runMenuAnalysis(
      () => parseMenuFile(fileToUpload, targetLang, sourceLang),
      sourceFile.uri || imageUri
    );
  };

  const handleParseUrl = async () => {
    const trimmedUrl = menuUrl.trim();
    if (!trimmedUrl) {
      Alert.alert(t.home.noUrlTitle, t.home.noUrlMessage);
      return;
    }

    setSelectedFile(null);
    setImageUri(null);

    return runMenuAnalysis(
      () => parseMenuUrl(trimmedUrl, targetLang, sourceLang),
      trimmedUrl
    );
  };

  const getCurrentShareUrl = () => {
    if (typeof window !== "undefined" && window.location?.href) {
      return window.location.href;
    }

    return "https://ai-menu-app.onrender.com";
  };

  const getShareMessage = () => `${t.home.shareMessage}\n${getCurrentShareUrl()}`;

  const isMobileWebBrowser = () => {
    if (typeof navigator === "undefined") {
      return false;
    }

    return /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
  };

  const shouldUseSystemShare = () => {
    if (Platform.OS === "ios" || Platform.OS === "android") {
      return true;
    }

    return (
      Platform.OS === "web" &&
      isMobileWebBrowser() &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function"
    );
  };

  const shareWithSystem = async () => {
    const currentUrl = getCurrentShareUrl();

    if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: t.home.shareTitle,
        text: t.home.shareMessage,
        url: currentUrl,
      });
      return;
    }

    await Share.share({
      title: t.home.shareTitle,
      message: getShareMessage(),
      url: currentUrl,
    });
  };

  const getShareTargets = () => {
    const currentUrl = getCurrentShareUrl();
    const encodedUrl = encodeURIComponent(currentUrl);
    const encodedText = encodeURIComponent(t.home.shareMessage);
    const emailSubject = encodeURIComponent(t.home.shareTitle);
    const emailBody = encodeURIComponent(`${t.home.shareMessage}\n${currentUrl}`);

    return [
      {
        key: "wechat",
        label: "Wechat 微信",
        icon: "wechat",
        url: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodedUrl}`,
      },
      {
        key: "xiaohongshu",
        label: "Rednote 小红书",
        icon: "book-open-variant",
        url: `https://www.xiaohongshu.com/search_result?keyword=${encodedText}`,
        copyBeforeOpen: true,
      },
      {
        key: "weibo",
        label: "Weibo 微博",
        icon: "sina-weibo",
        url: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedText}`,
      },
      {
        key: "facebook",
        label: "Facebook",
        icon: "facebook",
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        key: "x",
        label: "X / Twitter",
        icon: "twitter",
        url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        icon: "whatsapp",
        url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      },
      {
        key: "email",
        label: "Email",
        icon: "email-outline",
        url: `mailto:?subject=${emailSubject}&body=${emailBody}`,
      },
    ];
  };

  const handleShare = async () => {
    if (onShare) {
      onShare(getCurrentShareUrl(), t.home.shareMessage);
    }
  };

  const handleLogin = () => {
    if (currentUser) {
      if (onOpenProfile) onOpenProfile();
    } else {
      if (onOpenLogin) onOpenLogin();
    }
  };

  const currentLanguage =
    LANGUAGES.find((item) => item.code === targetLang) || LANGUAGES[0];

  return (
    <Surface style={styles.screen}>
      <Appbar.Header mode="center-aligned" style={styles.appbar}>
        <Appbar.Content title={t.appTitle} />
        <Appbar.Action icon="share-variant" onPress={handleShare} />
        <Appbar.Action icon="history" onPress={onOpenHistory} />
        <Appbar.Action icon="cart-outline" onPress={onOpenCart} />
        <Appbar.Action icon={currentUser ? "account-check" : "account-circle-outline"} onPress={handleLogin} />
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

            <View style={styles.languageRow}>
              <View style={styles.languageBox}>
                <Text style={styles.languageLabel}>{t.home.sourceLanguage}</Text>

                <Menu
                  visible={sourceLangMenuVisible}
                  onDismiss={() => setSourceLangMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setSourceLangMenuVisible(true)}
                      style={styles.languageButton}
                    >
                      {SOURCE_LANGUAGES.find((item) => item.code === sourceLang)?.flag}{" "}
                      {getSourceLanguageLabel(SOURCE_LANGUAGES.find((item) => item.code === sourceLang))}
                    </Button>
                  }
                >
                  {SOURCE_LANGUAGES.map((item) => (
                    <Menu.Item
                      key={item.code}
                      title={`${item.flag} ${getSourceLanguageLabel(item)}`}
                      onPress={() => {
                        handleSourceLanguageChange(item.code);
                        setSourceLangMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>
              </View>

              <View style={styles.languageBox}>
                <Text style={styles.languageLabel}>{t.home.targetLanguage}</Text>

                <Menu
                  visible={targetLangMenuVisible}
                  onDismiss={() => setTargetLangMenuVisible(false)}
                  anchor={
                    <Button
                      mode="outlined"
                      onPress={() => setTargetLangMenuVisible(true)}
                      style={styles.languageButton}
                    >
                      {LANGUAGES.find((item) => item.code === targetLang)?.flag}{" "}
                      {LANGUAGES.find((item) => item.code === targetLang)?.label}
                    </Button>
                  }
                >
                  {LANGUAGES.map((item) => (
                    <Menu.Item
                      key={item.code}
                      title={`${item.flag} ${item.label}`}
                      onPress={() => {
                        handleTargetLanguageChange(item.code);
                        setTargetLangMenuVisible(false);
                      }}
                    />
                  ))}
                </Menu>
              </View>
            </View>

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
              icon="file-document-outline"
              style={styles.outlineButton}
              contentStyle={styles.buttonContent}
              onPress={selectFromFile}
              disabled={loading}
            >
              {t.home.selectFromFile}
            </Button>

            <View style={styles.urlSection}>
              <TextInput
                mode="outlined"
                label={t.home.menuUrlLabel}
                placeholder={t.home.menuUrlPlaceholder}
                value={menuUrl}
                onChangeText={setMenuUrl}
                disabled={loading}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                left={<TextInput.Icon icon="link-variant" />}
                style={styles.urlInput}
              />

              <Button
                mode="outlined"
                icon="web"
                style={styles.urlButton}
                contentStyle={styles.buttonContent}
                onPress={handleParseUrl}
                disabled={loading || !menuUrl.trim()}
              >
                {t.home.analyzeUrl}
              </Button>
            </View>

            {loading && !imageUri && !selectedFile && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>
                  {t.home.analyzingMenu}
                </Text>
              </View>
            )}

            {(imageUri || selectedFile) && (
              <View style={styles.previewSection}>
                <Text variant="titleMedium" style={styles.previewTitle}>
                  {t.home.selectedMenu}
                </Text>

                {selectedFile && !isImageFile(selectedFile) ? (
                  <View style={styles.pdfPreview}>
                    <Text style={styles.pdfIcon}>DOC</Text>

                    <Text style={styles.pdfTitle}>
                      {selectedFile?.mimeType === "application/pdf"
                        ? t.home.pdfMenu
                        : t.home.documentMenu}
                    </Text>

                    <Text
                      style={styles.pdfName}
                      numberOfLines={2}
                    >
                      {selectedFile?.name || "menu.pdf"}
                    </Text>
                  </View>
                ) : imageUri ? (
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.preview}
                  />
                ) : null}
                
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
  urlSection: {
    marginTop: 4,
    gap: 10,
  },
  urlInput: {
    backgroundColor: "#FFFFFF",
  },
  urlButton: {
    borderRadius: 100,
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
  pdfPreview: {
    width: "100%",
    height: 280,
    borderRadius: 18,
    backgroundColor: "#E7E0EC",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },

  pdfIcon: {
    fontSize: 58,
    marginBottom: 12,
  },

  pdfTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1D1B20",
  },

  pdfName: {
    marginTop: 8,
    fontSize: 13,
    color: "#625B71",
    textAlign: "center",
  },  

  languageRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 22,
  },

  languageBox: {
    flex: 1,
  },

  languageLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#625B71",
    marginBottom: 6,
  },

  languageButton: {
    borderRadius: 14,
  },

  shareDialog: {
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
  },

  shareSubtitle: {
    color: "#625B71",
    marginBottom: 14,
  },

  shareButtonList: {
    gap: 10,
  },

  shareButton: {
    borderRadius: 14,
  },

  shareButtonContent: {
    height: 46,
    justifyContent: "flex-start",
  },
});
