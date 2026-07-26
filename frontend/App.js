import React, { useEffect, useState } from "react";
import * as Localization from "expo-localization";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { PaperProvider } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./screens/HomeScreen";
import MenuResultScreen from "./screens/MenuResultScreen";
import CartScreen from "./screens/CartScreen";
import HistoryScreen from "./screens/HistoryScreen";
import { getInitialLanguage, hasSavedLanguage, getText, getUrlLangParam, mapUrlLangToInternal } from "./i18n";
import { getCachedMenu, getProfile, getUserCart, saveUserCart, setAuthToken, getUnitTranslations } from "./api";
import { Platform, Share, Alert, LogBox, Linking, ScrollView, StatusBar, StyleSheet, Text, View, useColorScheme } from "react-native";
import { detectUserCurrency, setUnitTranslations } from "./utils/price";
import ShareDialog from "./components/ShareDialog";
import LoginRegisterModal from "./components/LoginRegisterModal";
import AccountProfileModal from "./components/AccountProfileModal";
import OnboardingModal from "./components/OnboardingModal";
import SettingsModal from "./components/SettingsModal";
import { getCartItems, setCartCloudSyncHandler, setCartItems } from "./storage/cartStorage";
import { getLegalContent } from "./legalContent";
import { resolveTheme, THEME_MODES, THEME_STORAGE_KEY } from "./theme";

// Ignore third-party deprecation and platform-specific fallback warnings
LogBox.ignoreLogs([
  "props.pointerEvents is deprecated",
  '"shadow*" style props are deprecated',
  "Animated: `useNativeDriver` is not supported",
]);

const POLICY_SUPPORT_EMAIL = "support@aimenu.us.kg";

const STATIC_POLICY_ROUTES = {
  "/account-deletion": "account-deletion",
  "/home/privacy-policy": "privacy-policy",
  "/privacy-policy": "privacy-policy",
  "/terms-of-service": "terms",
};
const ONBOARDING_STORAGE_KEY = "menu_app_onboarding_v1";

function getStaticPolicyRoute() {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;

  const pathname = window.location?.pathname || "";
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return STATIC_POLICY_ROUTES[normalizedPath] || null;
}

function StaticPolicyPage({ route }) {
  const isAccountDeletion = route === "account-deletion";
  const params = Platform.OS === "web" && typeof window !== "undefined"
    ? new URLSearchParams(window.location.search)
    : null;
  const targetLang = mapUrlLangToInternal(params?.get("lang")) || getInitialLanguage();
  const legal = getLegalContent(targetLang);
  const deletion = legal.deletion;
  const document = route === "terms" ? legal.terms : legal.privacy;
  const title = isAccountDeletion ? deletion.title : document.title;
  const subtitle = isAccountDeletion ? deletion.subtitle : "";
  const sections = isAccountDeletion ? deletion.sections : document.sections;
  const accountDeletionMailto =
    `mailto:${POLICY_SUPPORT_EMAIL}?subject=${encodeURIComponent(deletion.emailSubject)}` +
    `&body=${encodeURIComponent(deletion.emailBody)}`;

  return (
    <ScrollView style={policyStyles.screen} contentContainerStyle={policyStyles.container}>
      <View style={policyStyles.card}>
        <Text style={policyStyles.brand}>{legal.common.brand}</Text>
        <Text style={policyStyles.title}>{title}</Text>
        {!!subtitle && <Text style={policyStyles.subtitle}>{subtitle}</Text>}

        {isAccountDeletion ? (
          <Text
            accessibilityRole="link"
            onPress={() => Linking.openURL(accountDeletionMailto)}
            style={policyStyles.primaryLink}
          >
            {deletion.requestEmail}
          </Text>
        ) : (
          <Text style={policyStyles.body}>{document.intro}</Text>
        )}

        {sections.map((section) => (
          <View key={section.heading} style={policyStyles.section}>
            <Text style={policyStyles.heading}>{section.heading}</Text>
            {section.items.map((item) => (
              <View key={item} style={policyStyles.bulletRow}>
                <Text style={policyStyles.bulletMarker}>-</Text>
                <Text style={policyStyles.body}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={policyStyles.contact}>
          {legal.common.contact}:{" "}
          <Text
            accessibilityRole="link"
            onPress={() => Linking.openURL(`mailto:${POLICY_SUPPORT_EMAIL}`)}
            style={policyStyles.inlineLink}
          >
            {POLICY_SUPPORT_EMAIL}
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

function getSharedMenuUrlFromParams(params) {
  if (!params) return "";
  return (
    params.get("menu_url") ||
    params.get("share_url") ||
    params.get("restaurant_url") ||
    params.get("url") ||
    params.get("text") ||
    ""
  );
}

function getSharedMenuUrlFromAppUrl(urlString) {
  if (!urlString) return "";

  try {
    const parsed = new URL(urlString);
    return getSharedMenuUrlFromParams(parsed.searchParams);
  } catch (err) {
    console.log("Unable to parse incoming menu URL:", err);
    return "";
  }
}

function AppContent({ themeMode, onThemeModeChange }) {
  const [screen, setScreen] = useState("home");
  const [menuResult, setMenuResult] = useState(null);
  const [targetLang, setTargetLang] = useState(getInitialLanguage());
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const [appInitialized, setAppInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [incomingMenuUrl, setIncomingMenuUrl] = useState("");

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_STORAGE_KEY)
      .then((value) => setShowOnboarding(!value))
      .catch((err) => console.warn("Unable to load onboarding state:", err));
  }, []);

  useEffect(() => {
    async function initializeApp() {
      // Detect user currency based on IP (non-blocking)
      detectUserCurrency().catch((err) => console.log("Failed to detect user currency:", err));

      // Fetch and cache unit translations from DB (non-blocking)
      getUnitTranslations()
        .then((translations) => {
          setUnitTranslations(translations);
        })
        .catch((err) => console.log("Failed to load unit translations from DB:", err));

      let oauthToken = null;
      
      // 1. Check for OAuth hash tokens
      if (typeof window !== "undefined" && window.location && window.location.hash) {
        const hash = window.location.hash.substring(1);
        const hashParams = new URLSearchParams(hash);
        oauthToken = hashParams.get("access_token");
        if (oauthToken) {
          try {
            setAuthToken(oauthToken);
            await handleLoginSuccess(oauthToken, null);
            const user = await getProfile();
            setCurrentUser(user);
          } catch (err) {
            console.log("Failed to load profile from OAuth token:", err);
          }
        }
      }

      // 2. Load session from AsyncStorage only if not logged in via OAuth hash
      if (!oauthToken) {
        try {
          const token = await AsyncStorage.getItem("menu_app_token");
          if (token) {
            setAuthToken(token);
            const user = await getProfile();
            setCurrentUser(user);
          }
        } catch (err) {
          console.log("Auto-login failed:", err);
          // Clean up invalid/expired token so we don't try to use it again
          try {
            await AsyncStorage.removeItem("menu_app_token");
            setAuthToken(null);
          } catch (e) {
            console.warn("Failed to clear invalid token:", e);
          }
        }
      }

      // 3. Check for menu query params
      if (typeof window !== "undefined" && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const menuHash = params.get("menu_hash");
        const sharedMenuUrl = getSharedMenuUrlFromParams(params);
        const langParam = params.get("lang") || params.get("target_lang");
        const mappedLang = mapUrlLangToInternal(langParam);

        if (menuHash) {
          const fetchLang = mappedLang || targetLang || "zh";
          try {
            const data = await getCachedMenu(menuHash, fetchLang);
            setMenuResult(data);
            if (mappedLang) {
              setTargetLang(mappedLang);
            } else {
              setTargetLang(fetchLang);
            }
            setScreen("result");
          } catch (err) {
            console.log("Failed to load shared menu:", err);
          }
        } else if (sharedMenuUrl) {
          setIncomingMenuUrl(sharedMenuUrl);
          setScreen("home");
          if (mappedLang) {
            setTargetLang(mappedLang);
          }
        } else if (mappedLang) {
          setTargetLang(mappedLang);
        }
      }

      if (Platform.OS !== "web") {
        const initialUrl = await Linking.getInitialURL();
        const sharedUrl = getSharedMenuUrlFromAppUrl(initialUrl);
        if (sharedUrl) {
          setIncomingMenuUrl(sharedUrl);
          setScreen("home");
        }
      }
      setAppInitialized(true);
    }
    initializeApp();
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return undefined;

    const subscription = Linking.addEventListener("url", ({ url }) => {
      const sharedUrl = getSharedMenuUrlFromAppUrl(url);
      if (sharedUrl) {
        setIncomingMenuUrl(sharedUrl);
        setScreen("home");
      }
    });

    return () => {
      subscription?.remove?.();
    };
  }, []);

  const handleLoginSuccess = async (token, user) => {
    try {
      await AsyncStorage.setItem("menu_app_token", token);
      setAuthToken(token);
      setCurrentUser(user);
    } catch (e) {
      console.warn("Save token failed", e);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem("menu_app_token");
      setAuthToken(null);
      setCurrentUser(null);
    } catch (e) {
      console.warn("Remove token failed", e);
    }
  };

  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);
  };

  const syncCartForAuthenticatedUser = async () => {
    try {
      const localItems = await getCartItems();

      if (localItems.length > 0) {
        await saveUserCart(localItems);
        return;
      }

      const remoteCart = await getUserCart();
      const remoteItems = remoteCart?.items || [];

      if (remoteItems.length > 0) {
        await setCartItems(remoteItems, { skipCloudSync: true });
      }
    } catch (err) {
      console.warn("Cart sync after login failed:", err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      setCartCloudSyncHandler(saveUserCart);
      syncCartForAuthenticatedUser();
    } else {
      setCartCloudSyncHandler(null);
    }

    return () => {
      setCartCloudSyncHandler(null);
    };
  }, [currentUser?.id]);

  // Combined app initialization is handled in the unified useEffect above.

  useEffect(() => {
    if (!appInitialized) return;
    if (typeof window === "undefined" || !window.location || !window.history?.replaceState) return;

    const url = new URL(window.location.href);
    const currentLangParam = url.searchParams.get("lang");
    const targetLangParam = getUrlLangParam(targetLang);

    if (currentLangParam !== targetLangParam) {
      url.searchParams.set("lang", targetLangParam);
    }

    if (screen === "result" && menuResult) {
      const hash = menuResult.image_hash || menuResult.hash || "";
      if (hash) {
        url.searchParams.set("menu_hash", hash);
      }
    } else if (screen === "home" || screen === "cart" || screen === "history") {
      url.searchParams.delete("menu_hash");
      url.searchParams.delete("show_recommend");
      url.searchParams.delete("dish_name");
    }

    window.history.replaceState({}, "", url.pathname + url.search);
  }, [appInitialized, targetLang, screen, menuResult]);

  useEffect(() => {
    if (languageInitialized || hasSavedLanguage()) {
      setLanguageInitialized(true);
      return;
    }

    const locales = Localization.getLocales?.();
    const locale = locales?.[0];
    const deviceLang = (
      locale?.languageTag ||
      Localization.locale ||
      locale?.languageCode ||
      "en"
    ).toLowerCase();

    setTargetLang(mapUrlLangToInternal(deviceLang));

    setLanguageInitialized(true);
  }, [languageInitialized]);

  const [shareDialogVisible, setShareDialogVisible] = useState(false);
  const [shareUrl, setShareUrl] = useState("https://ai-menu-app.onrender.com");
  const [shareMessage, setShareMessage] = useState("");

  const handleShareGlobal = async (customUrl, customMessage) => {
    const t = getText(targetLang);
    let url = customUrl;
    if (Platform.OS === "web" && typeof window !== "undefined" && window.location?.href) {
      url = window.location.href;
    } else if (!url) {
      url = "https://ai-menu-app.onrender.com";
    }
    const msg = customMessage || t.home.shareMessage;

    setShareUrl(url);
    setShareMessage(msg);

    const isMobileWebBrowser = () => {
      if (typeof navigator === "undefined") return false;
      return /android|iphone|ipad|ipod/i.test(navigator.userAgent || "");
    };

    const shouldUseSystemShare = () => {
      if (Platform.OS === "ios" || Platform.OS === "android") return true;
      return (
        Platform.OS === "web" &&
        isMobileWebBrowser() &&
        typeof navigator !== "undefined" &&
        typeof navigator.share === "function"
      );
    };

    if (shouldUseSystemShare()) {
      try {
        if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.share) {
          await navigator.share({
            title: t.home.shareTitle,
            text: msg,
            url: url,
          });
          return;
        }
        await Share.share({
          title: t.home.shareTitle,
          message: `${msg}\n${url}`,
          url: url,
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          Alert.alert(t.home.shareFailed, error.message || t.home.unknownError);
        }
      }
      return;
    }

    setShareDialogVisible(true);
  };

  let screenComponent;

  const onOpenLogin = () => setShowLoginModal(true);
  const onOpenProfile = () => setShowProfileModal(true);
  const onOpenSettings = () => setShowSettingsModal(true);

  if (screen === "cart") {
    screenComponent = (
      <CartScreen
        onBack={() => setScreen("home")}
        targetLang={targetLang}
        onOpenHistory={() => setScreen("history")}
        onOpenCart={() => setScreen("cart")}
        onShare={handleShareGlobal}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenProfile={onOpenProfile}
        hasMenuResult={menuResult !== null}
        onBackToResult={() => setScreen("result")}
        onGoHome={() => setScreen("home")}
        onOpenSettings={onOpenSettings}
      />
    );
  } else if (screen === "history") {
    screenComponent = (
      <HistoryScreen
        targetLang={targetLang}
        onBack={() => setScreen("home")}
        onOpenCart={() => setScreen("cart")}
        onOpenHistory={() => setScreen("history")}
        onOpenMenu={(record) => {
          setMenuResult(record.raw || record);
          setTargetLang(record.targetLang || targetLang);
          setScreen("result");
        }}
        onShare={handleShareGlobal}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenProfile={onOpenProfile}
        hasMenuResult={menuResult !== null}
        onBackToResult={() => setScreen("result")}
        onGoHome={() => setScreen("home")}
        onOpenSettings={onOpenSettings}
      />
    );
  } else if (screen === "result" && menuResult) {
    screenComponent = (
      <MenuResultScreen
        menuResult={menuResult}
        targetLang={targetLang}
        onBack={() => setScreen("home")}
        onOpenCart={() => setScreen("cart")}
        onOpenHistory={() => setScreen("history")}
        onShare={handleShareGlobal}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
      />
    );
  } else {
    screenComponent = (
      <HomeScreen
        targetLang={targetLang}
        setTargetLang={setTargetLang}
        onMenuParsed={(data) => {
          setMenuResult(data);
          setScreen("result");
        }}
        onOpenCart={() => setScreen("cart")}
        onOpenHistory={() => setScreen("history")}
        onShare={handleShareGlobal}
        currentUser={currentUser}
        onOpenLogin={onOpenLogin}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        initialMenuUrl={incomingMenuUrl}
      />
    );
  }

  return (
    <>
      {screenComponent}
      <ShareDialog
        visible={shareDialogVisible}
        onClose={() => setShareDialogVisible(false)}
        shareUrl={shareUrl}
        shareMessage={shareMessage}
        targetLang={targetLang}
      />
      <LoginRegisterModal
        visible={showLoginModal}
        targetLang={targetLang}
        onClose={() => setShowLoginModal(false)}
        onLoginSuccess={handleLoginSuccess}
      />
      <AccountProfileModal
        visible={showProfileModal}
        currentUser={currentUser}
        targetLang={targetLang}
        onClose={() => setShowProfileModal(false)}
        onUpdateUser={handleUpdateUser}
        onLogout={handleLogout}
      />
      <SettingsModal
        visible={showSettingsModal}
        targetLang={targetLang}
        themeMode={themeMode}
        onThemeModeChange={onThemeModeChange}
        onReplayOnboarding={() => setShowOnboarding(true)}
        onClose={() => setShowSettingsModal(false)}
      />
      <OnboardingModal
        visible={showOnboarding}
        targetLang={targetLang}
        onComplete={async () => {
          await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, "1");
          setShowOnboarding(false);
        }}
      />
    </>
  );
}

export default function App() {
  const staticPolicyRoute = getStaticPolicyRoute();
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = useState("system");
  const theme = resolveTheme(themeMode, systemColorScheme);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedMode) => {
        if (THEME_MODES.includes(savedMode)) setThemeMode(savedMode);
      })
      .catch((err) => console.warn("Unable to load theme preference:", err));
  }, []);

  const handleThemeModeChange = (nextMode) => {
    if (!THEME_MODES.includes(nextMode)) return;
    setThemeMode(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch((err) =>
      console.warn("Unable to save theme preference:", err)
    );
  };

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <StatusBar
          barStyle={theme.dark ? "light-content" : "dark-content"}
          backgroundColor={theme.colors.background}
        />
        {staticPolicyRoute ? (
          <StaticPolicyPage route={staticPolicyRoute} />
        ) : (
          <AppContent themeMode={themeMode} onThemeModeChange={handleThemeModeChange} />
        )}
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const policyStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF8F3",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 860,
    backgroundColor: "#FFFFFF",
    borderColor: "#E6DED8",
    borderWidth: 1,
    borderRadius: 24,
    padding: 28,
  },
  brand: {
    color: "#6750A4",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  title: {
    color: "#1D1B20",
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800",
    marginBottom: 10,
  },
  subtitle: {
    color: "#625B71",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 18,
  },
  section: {
    marginTop: 22,
  },
  heading: {
    color: "#1D1B20",
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "800",
    marginBottom: 10,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  bulletMarker: {
    color: "#6750A4",
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "800",
  },
  body: {
    flex: 1,
    color: "#49454F",
    fontSize: 16,
    lineHeight: 24,
  },
  primaryLink: {
    alignSelf: "flex-start",
    backgroundColor: "#6750A4",
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 4,
    marginBottom: 4,
  },
  contact: {
    color: "#625B71",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 28,
  },
  inlineLink: {
    color: "#6750A4",
    fontWeight: "800",
  },
});
