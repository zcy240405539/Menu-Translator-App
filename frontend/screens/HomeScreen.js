import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Image,
  StyleSheet,
  Alert,
  Linking,
  Platform,
  Share,
  ScrollView,
  KeyboardAvoidingView,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { saveMenuHistory } from "../storage/menuStorage";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as ImageManipulator from "expo-image-manipulator";
import {
  Button,
  Card,
  Text,
  Surface,
  Menu,
  ActivityIndicator,
  Portal,
  Dialog,
  TextInput,
  useTheme,
} from "react-native-paper";

import { parseMenuFile, parseMenuUrl } from "../api";
import { InterstitialAd, AdEventType, AD_UNIT_IDS } from "../utils/ads";
import {
  getText,
  getLanguageLabel,
  saveLanguage,
  LANGUAGES,
  SOURCE_LANGUAGES,
} from "../i18n";
import FloatingToolbar from "../components/FloatingToolbar";


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

function getSelectedFiles(assets, fallbackName, fallbackType) {
  if (!assets?.length || assets.some(asset =>
    !asset || typeof asset.uri !== "string" || !asset.uri.trim() ||
    asset.fileSize === 0 || asset.size === 0
  )) {
    throw new Error("The selected file cannot be read. Please select it again.");
  }
  return assets.map(asset => ({
    uri: asset.uri,
    name: asset.fileName || asset.name || fallbackName,
    mimeType: asset.mimeType || fallbackType,
  }));
}

export default function HomeScreen({ targetLang, setTargetLang, onMenuParsed, onGoHome, onOpenCart, onOpenHistory, onShare, onOpenSettings, initialMenuUrl, adsReady }) {
  const [loading, setLoading] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [sourceLangMenuVisible, setSourceLangMenuVisible] = useState(false);
  const [targetLangMenuVisible, setTargetLangMenuVisible] = useState(false);
  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [menuUrl, setMenuUrl] = useState("");
  const interstitialRef = useRef(null);
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const lang = targetLang;
  const t = getText(lang);
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isDesktopLayout = isWeb && width >= 900;

  useEffect(() => {
    if (initialMenuUrl) {
      setMenuUrl(initialMenuUrl);
    }
  }, [initialMenuUrl]);

  // source and target languages should not be the same
  const handleSourceLanguageChange = (newSourceLang) => {
    if (newSourceLang === targetLang) {
      const previousSourceLang = sourceLang;

      setSourceLang(newSourceLang);

      const newTargetLang =
        previousSourceLang !== "auto" && previousSourceLang !== newSourceLang
          ? previousSourceLang
          : newSourceLang === "en" ? "es" : "en";
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
    return getLanguageLabel(targetLang, item.code);
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


  const selectFromPhotoLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(t.home.permissionRequired || "Permission Required", "Photo library permission is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.4,
        allowsEditing: false,
        allowsMultipleSelection: true,
        selectionLimit: 6,
      });
      if (!result.canceled) {
        let assets = result.assets;
        if (assets?.length > 6) {
          Alert.alert(t.home.maxImagesLimit || "Limit Exceeded", t.home.maxImagesLimit || "You can only select up to 6 images.");
          assets = assets.slice(0, 6);
        }
        setSelectedFiles(getSelectedFiles(assets, "library-menu.jpg", "image/jpeg"));
        setMenuUrl("");
      }
    } catch (error) {
      Alert.alert(t.home.fileSelectionFailed, error.message || t.home.unknownError);
    }
  };

  const takePicture = async () => {
    try {
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
        setSelectedFiles(getSelectedFiles(result.assets, "camera-menu.jpg", "image/jpeg"));
        setMenuUrl("");
      }
    } catch (error) {
      Alert.alert(t.home.fileSelectionFailed, error.message || t.home.unknownError);
    }
  };

  const compressImage = async (file) => {
    try {
      const result = await ImageManipulator.manipulateAsync(
        file.uri,
        [{ resize: { width: 1000 } }],
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG }
      );
      if (typeof result.uri !== "string" || !result.uri.trim()) {
        throw new Error("Image compression returned no file.");
      }
      return { uri: result.uri, name: "menu_compressed.jpg", mimeType: "image/jpeg" };
    } catch (err) {
      console.log("Image compression failed:", err);
      return file;
    }
  };

  const selectFromFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: DOCUMENT_PICKER_TYPES,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      setSelectedFiles(getSelectedFiles(result.assets, "menu", "application/octet-stream"));
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
          await saveMenuHistory(data, historySource || menuUrl, targetLang);
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
      if (Platform.OS !== "web" && adsReady && InterstitialAd) {
        interstitialRef.current = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);
        const interstitial = interstitialRef.current;
        
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
          
          if (__DEV__) {
            console.log("DEV mode: Skipping interstitial ad display to avoid being stuck.");
            setTimeout(() => {
              adClosed = true;
              if (parseResult) {
                navigateToResult(parseResult);
                setLoading(false);
              } else if (parseError) {
                Alert.alert(t.home.analysisFailed || "Analysis Failed", parseError.message || JSON.stringify(parseError));
                setLoading(false);
              }
            }, 2000); // simulate ad viewing for 2s
          } else {
            interstitial.show().catch((err) => {
              console.warn("Failed to show interstitial ad:", err);
              adClosed = true;
              if (parseResult) {
                navigateToResult(parseResult);
                setLoading(false);
              } else if (parseError) {
                Alert.alert(t.home.analysisFailed || "Analysis Failed", parseError.message || JSON.stringify(parseError));
                setLoading(false);
              }
            });
          }
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
    if (!selectedFiles || selectedFiles.length === 0) {
      Alert.alert(t.home.noMenuTitle, t.home.noMenuMessage);
      return;
    }

    return runMenuAnalysis(
      async () => {
        const filesToUpload = [];
        for (const file of selectedFiles) {
          filesToUpload.push(isImageFile(file) ? await compressImage(file) : file);
        }
        return parseMenuFile(filesToUpload, targetLang, sourceLang);
      },
      selectedFiles[0].uri
    );
  };

  const handleParseUrl = async () => {
    const trimmedUrl = menuUrl.trim();
    if (!trimmedUrl) {
      Alert.alert(t.home.noUrlTitle, t.home.noUrlMessage);
      return;
    }

    setSelectedFiles([]);

    return runMenuAnalysis(
      () => parseMenuUrl(trimmedUrl, targetLang, sourceLang),
      trimmedUrl
    );
  };

  const hasSelectedMenuFile = Boolean(selectedFiles && selectedFiles.length > 0);
  const hasMenuUrl = Boolean(menuUrl.trim());
  const canAnalyzeMenu = hasSelectedMenuFile || hasMenuUrl;

  const handleAnalyzeMenu = async () => {
    if (hasSelectedMenuFile) {
      return handleParse();
    }
    if (hasMenuUrl) {
      return handleParseUrl();
    }
    Alert.alert(t.home.noMenuTitle || "No Menu Selected", t.home.noMenuMessage || "Please select a file or enter a menu URL.");
  };

  const getCurrentShareUrl = () => {
    if (typeof window !== "undefined" && window.location?.href) {
      return window.location.href;
    }

    return "https://aimenu.us.kg";
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
        label: t.home.shareTargets.wechat,
        icon: "wechat",
        url: `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodedUrl}`,
      },
      {
        key: "xiaohongshu",
        label: t.home.shareTargets.rednote,
        icon: "book-open-variant",
        url: `https://www.xiaohongshu.com/search_result?keyword=${encodedText}`,
        copyBeforeOpen: true,
      },
      {
        key: "weibo",
        label: t.home.shareTargets.weibo,
        icon: "sina-weibo",
        url: `https://service.weibo.com/share/share.php?url=${encodedUrl}&title=${encodedText}`,
      },
      {
        key: "facebook",
        label: t.home.shareTargets.facebook,
        icon: "facebook",
        url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      },
      {
        key: "x",
        label: t.home.shareTargets.x,
        icon: "twitter",
        url: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`,
      },
      {
        key: "whatsapp",
        label: t.home.shareTargets.whatsapp,
        icon: "whatsapp",
        url: `https://wa.me/?text=${encodedText}%20${encodedUrl}`,
      },
      {
        key: "email",
        label: t.home.shareTargets.email,
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

  const homeFeatureItems = [
      { title: t.home.featureDocuments, color: '#EA4335' }, // Red
      { title: t.home.featureTranslation, color: '#4285F4' }, // Blue
      { title: t.home.featureOrderList, color: '#34A853' }, // Green
      { title: t.home.featureAiRecommend, color: '#FBBC05' }, // Yellow
    ];

  return (
    <Surface style={[styles.screen, isDesktopLayout && styles.screenDesktop, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktopLayout && styles.scrollContentDesktop,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.homeLayout, isDesktopLayout && styles.homeLayoutDesktop]}>
          <View style={[styles.heroPanel, isDesktopLayout && styles.heroPanelDesktop]}>
            <Text style={[styles.title, isDesktopLayout && styles.titleDesktop, { color: theme.colors.onSurface }]}>
              {t.home.heroTitle}
            </Text>

            <Text variant="bodyLarge" style={[styles.subtitle, isDesktopLayout && styles.subtitleDesktop, { color: theme.colors.onSurfaceVariant }]}>
              {t.home.heroSubtitle}
            </Text>
          </View>

          <Card mode={isDesktopLayout ? "outlined" : "elevated"} style={[styles.toolPanel, isDesktopLayout && styles.toolPanelDesktop, { backgroundColor: theme.colors.surface }]}>
            <Card.Content style={styles.toolContent}>
              <View>
              </View>

              <View style={styles.languageRow}>
                <View style={styles.languageBox}>
                  <Text style={[styles.languageLabel, { color: theme.colors.onSurfaceVariant }]}>{t.home.sourceLanguage}</Text>

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
                  <Text style={[styles.languageLabel, { color: theme.colors.onSurfaceVariant }]}>{t.home.targetLanguage}</Text>

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
                        {getLanguageLabel(targetLang, targetLang)}
                      </Button>
                    }
                  >
                    {LANGUAGES.map((item) => (
                      <Menu.Item
                        key={item.code}
                        title={`${item.flag} ${getLanguageLabel(targetLang, item.code)}`}
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
                    mode="contained-tonal"
                    icon="image-outline"
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    buttonColor="#EADDFF"
                    textColor="#21005D"
                    onPress={selectFromPhotoLibrary}
                    disabled={loading}
                  >
                    {t.home.selectFromGallery || "Photo Library"}
                  </Button>

                  <Button
                    mode="contained-tonal"
                    icon="camera-outline"
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  buttonColor="#EADDFF"
                  textColor="#21005D"
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
                  style={[styles.urlInput, { backgroundColor: theme.colors.surface }]}
                />
              </View>

              {(selectedFiles && selectedFiles.length > 0) && (
                <View style={[styles.previewSection, isDesktopLayout && styles.previewSectionDesktop]}>
                  <Text variant="titleMedium" style={[styles.previewTitle, { color: theme.colors.onSurface }]}>
                    {t.home.selectedMenu}
                  </Text>

                  {selectedFiles[0] && !isImageFile(selectedFiles[0]) ? (
                    <View style={[styles.pdfPreview, isDesktopLayout && styles.pdfPreviewDesktop]}>
                      <Text style={[styles.pdfTitle, { color: theme.colors.onSurface }]}>
                        {isPdfFile(selectedFiles[0])
                          ? t.home.pdfFileSelected
                          : t.home.documentFileSelected}
                      </Text>

                      <Text
                        style={[styles.pdfName, { color: theme.colors.onSurfaceVariant }]}
                        numberOfLines={2}
                      >
                        {selectedFiles[0]?.name || "menu.pdf"}
                      </Text>
                    </View>
                  ) : selectedFiles.length === 1 ? (
                      <Image
                        source={{ uri: selectedFiles[0].uri }}
                        style={[styles.preview, isDesktopLayout && styles.previewDesktop]}
                      />
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ width: '100%' }}>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                          {selectedFiles.map((file, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: file.uri }}
                              style={[
                                styles.preview,
                                { width: 180, height: 250 },
                                isDesktopLayout && styles.previewDesktop
                              ]}
                            />
                          ))}
                        </View>
                      </ScrollView>
                      )}
                  </View>
              )}

              {loading ? (
                <View style={styles.loadingBox}>
                  <Text style={[styles.holdOnText, { color: theme.colors.onSurface }]}>
                    {t.home.holdOnText}
                  </Text>
                  <ActivityIndicator size="large" />
                  <Text style={[styles.loadingText, { color: theme.colors.onSurfaceVariant }]}>
                    {t.home.analyzingMenu}
                  </Text>
                </View>
              ) : (
                <Button
                  mode="contained"
                  icon="magic-staff"
                  style={[styles.analyzeButton, isDesktopLayout && styles.analyzeButtonDesktop]}
                  contentStyle={styles.buttonContent}
                  buttonColor="#6750A4"
                  textColor="#FFFFFF"
                  onPress={handleAnalyzeMenu}
                  disabled={!canAnalyzeMenu}
                >
                  {t.home.analyzeMenu}
                </Button>
              )}
            </Card.Content>
          </Card>


            <View style={styles.featureRow}>
              {homeFeatureItems.map((item, index) => (
                  <View key={item.title} style={[
                    styles.featureTextCard,
                    isDesktopLayout && styles.featureTextCardDesktop,
                    { borderTopColor: item.color }
                  ]}>
                    <Text style={[styles.featureText, { color: theme.colors.onSurface }]}>
                      {item.title}
                    </Text>
                  </View>
                ))}
            </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      <FloatingToolbar
        activeKey="home"
        targetLang={targetLang}
        onGoHome={onGoHome}
        onShare={handleShare}
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
  screenDesktop: {
    backgroundColor: "#F7F7FA",
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 28,
    alignSelf: "center",
    width: "100%",
    maxWidth: 960,
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
    color: "#6D50B3",
    fontSize: 24,
    lineHeight: 32,
    marginBottom: 10,
  },
  titleDesktop: {
    textAlign: "left",
    fontSize: 32,
    lineHeight: 40,
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
    marginTop: 32,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  featureTextCard: {
      width: "48%",
      minWidth: 140,
      flexGrow: 1,
      borderTopWidth: 4,
      backgroundColor: "transparent",
      paddingHorizontal: 8,
      paddingVertical: 16,
      flexDirection: "column",
      alignItems: "flex-start",
      gap: 4,
    },
  featureTextCardDesktop: {
      width: "23%",
      maxWidth: "23%",
      minWidth: 160,
    },
  featureNumber: {
      fontSize: 18,
      fontWeight: "800",
      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    },
  featureText: {
      fontSize: 18,
      fontWeight: "700",
      lineHeight: 24,
      marginTop: 4,
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
