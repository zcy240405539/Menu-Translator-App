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
  useWindowDimensions,
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
  const { width, height } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopLayout = isWeb && width >= 900;
  const shouldHideAppTitle = isWeb && (width < 520 || height < 560);

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

  const isPdfFile = (file) => {
    const mimeType = (file?.mimeType || file?.type || "").toLowerCase();
    const fileName = (file?.name || file?.uri || "").toLowerCase();
    return mimeType === "application/pdf" || fileName.endsWith(".pdf");
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

  const hasSelectedMenuFile = Boolean(selectedFile || imageUri);
  const hasMenuUrl = Boolean(menuUrl.trim());
  const canAnalyzeMenu = hasSelectedMenuFile || hasMenuUrl;

  const handleAnalyzeMenu = async () => {
    if (hasSelectedMenuFile) {
      return handleParse();
    }

    return handleParseUrl();
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

  const homeFeatureItems = [
    t.home.featureDocuments,
    t.home.featureTranslation,
    t.home.featureOrderList,
  ];

  return (
    <Surface style={[styles.screen, isDesktopLayout && styles.screenDesktop]}>
      <Appbar.Header mode="center-aligned" style={[styles.appbar, isDesktopLayout && styles.appbarDesktop]}>
        <Appbar.Content title={shouldHideAppTitle ? "" : t.appTitle} />
        <Appbar.Action icon="share-variant" onPress={handleShare} />
        <Appbar.Action icon="history" onPress={onOpenHistory} />
        <Appbar.Action icon="cart-outline" onPress={onOpenCart} />
        <Appbar.Action icon={currentUser ? "account-check" : "account-circle-outline"} onPress={handleLogin} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopLayout && styles.scrollContentDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.homeLayout, isDesktopLayout && styles.homeLayoutDesktop]}>
          <View style={[styles.heroPanel, isDesktopLayout && styles.heroPanelDesktop]}>
            <Text style={styles.heroKicker}>{t.home.heroKicker}</Text>
            <Text variant="displaySmall" style={[styles.title, isDesktopLayout && styles.titleDesktop]}>
              {t.home.heroTitle}
            </Text>

            <Text variant="bodyLarge" style={[styles.subtitle, isDesktopLayout && styles.subtitleDesktop]}>
              {t.home.heroSubtitle}
            </Text>

            <View style={styles.featureRow}>
              {homeFeatureItems.map((item, index) => (
                <View key={item} style={[styles.featurePill, isDesktopLayout && styles.featurePillDesktop]}>
                  <Text style={styles.featureNumber}>{String(index + 1).padStart(2, "0")}</Text>
                  <Text style={styles.featureText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>

          <Card mode={isDesktopLayout ? "outlined" : "elevated"} style={[styles.toolPanel, isDesktopLayout && styles.toolPanelDesktop]}>
            <Card.Content style={styles.toolContent}>
              <View>
                <Text style={styles.toolKicker}>{t.home.toolKicker}</Text>
                <Text variant="headlineSmall" style={styles.toolTitle}>
                  {t.home.toolTitle}
                </Text>
              </View>

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

              <View style={styles.inputActions}>
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
              </View>

              {(imageUri || selectedFile) && (
                <View style={[styles.previewSection, isDesktopLayout && styles.previewSectionDesktop]}>
                  <Text variant="titleMedium" style={styles.previewTitle}>
                    {t.home.selectedMenu}
                  </Text>

                  {selectedFile && !isImageFile(selectedFile) ? (
                    <View style={[styles.pdfPreview, isDesktopLayout && styles.pdfPreviewDesktop]}>
                      <Text style={styles.pdfTitle}>
                        {isPdfFile(selectedFile)
                          ? t.home.pdfFileSelected
                          : t.home.documentFileSelected}
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
                      style={[styles.preview, isDesktopLayout && styles.previewDesktop]}
                    />
                  ) : null}
                </View>
              )}

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
                  style={[styles.analyzeButton, isDesktopLayout && styles.analyzeButtonDesktop]}
                  contentStyle={styles.buttonContent}
                  onPress={handleAnalyzeMenu}
                  disabled={!canAnalyzeMenu}
                >
                  {t.home.analyzeMenu}
                </Button>
              )}
            </Card.Content>
          </Card>
        </View>
      </ScrollView>


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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  scrollContentDesktop: {
    justifyContent: "flex-start",
    paddingHorizontal: 40,
    paddingVertical: 42,
  },
  homeLayout: {
    width: "100%",
    maxWidth: 1120,
    alignSelf: "center",
    gap: 18,
  },
  homeLayoutDesktop: {
    maxWidth: 1180,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 28,
  },
  heroPanel: {
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  heroPanelDesktop: {
    flex: 1,
    minHeight: 560,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 42,
  },
  toolPanel: {
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  toolPanelDesktop: {
    width: 468,
    borderRadius: 8,
    borderColor: "#E7E0EC",
  },
  toolContent: {
    padding: 24,
    gap: 18,
  },
  heroKicker: {
    color: "#6D50B3",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  title: {
    textAlign: "left",
    fontWeight: "800",
    color: "#1D1B20",
    marginBottom: 10,
  },
  titleDesktop: {
    textAlign: "left",
    fontSize: 48,
    lineHeight: 56,
    maxWidth: 620,
  },
  subtitle: {
    textAlign: "left",
    color: "#625B71",
    lineHeight: 24,
    marginBottom: 18,
  },
  subtitleDesktop: {
    textAlign: "left",
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 30,
    maxWidth: 560,
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featurePill: {
    minWidth: 148,
    flexGrow: 1,
    borderWidth: 1,
    borderColor: "#E7E0EC",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  featurePillDesktop: {
    maxWidth: 186,
  },
  featureNumber: {
    color: "#6D50B3",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 6,
  },
  featureText: {
    color: "#1D1B20",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  toolKicker: {
    color: "#6D50B3",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  toolTitle: {
    color: "#1D1B20",
    fontWeight: "800",
    marginTop: 4,
  },
  button: {
    borderRadius: 8,
  },
  outlineButton: {
    borderRadius: 8,
  },
  analyzeButton: {
    borderRadius: 8,
  },
  buttonContent: {
    height: 50,
  },
  inputActions: {
    gap: 10,
  },
  urlInput: {
    backgroundColor: "#FFFFFF",
  },
  previewSection: {
    marginTop: 2,
  },
  previewSectionDesktop: {
    marginTop: 0,
  },
  previewTitle: {
    marginBottom: 10,
    fontWeight: "700",
    color: "#1D1B20",
  },
  preview: {
    width: "100%",
    height: 250,
    resizeMode: "contain",
    borderRadius: 8,
    backgroundColor: "#E7E0EC",
  },
  previewDesktop: {
    height: 260,
    borderRadius: 8,
    backgroundColor: "#F0EDF5",
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
    minHeight: 132,
    borderRadius: 8,
    backgroundColor: "#E7E0EC",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  pdfPreviewDesktop: {
    minHeight: 220,
    borderRadius: 8,
    backgroundColor: "#F0EDF5",
  },

  pdfTitle: {
    fontSize: 18,
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
    flexWrap: "wrap",
  },

  languageBox: {
    flex: 1,
    minWidth: 150,
  },

  languageLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#625B71",
    marginBottom: 6,
  },

  languageButton: {
    borderRadius: 8,
  },
  analyzeButtonDesktop: {
    marginTop: 2,
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
