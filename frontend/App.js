import React, { useEffect, useState } from "react";
import * as Localization from "expo-localization";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HomeScreen from "./screens/HomeScreen";
import MenuResultScreen from "./screens/MenuResultScreen";
import CartScreen from "./screens/CartScreen";
import HistoryScreen from "./screens/HistoryScreen";
import { getInitialLanguage, hasSavedLanguage, getText, getUrlLangParam, mapUrlLangToInternal } from "./i18n";
import { getCachedMenu, getProfile, getUserCart, saveUserCart, setAuthToken } from "./api";
import { Platform, Share, Alert, LogBox, Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { detectUserCurrency } from "./utils/price";
import ShareDialog from "./components/ShareDialog";
import LoginRegisterModal from "./components/LoginRegisterModal";
import AccountProfileModal from "./components/AccountProfileModal";
import { getCartItems, setCartCloudSyncHandler, setCartItems } from "./storage/cartStorage";

// Ignore third-party deprecation and platform-specific fallback warnings
LogBox.ignoreLogs([
  "props.pointerEvents is deprecated",
  '"shadow*" style props are deprecated',
  "Animated: `useNativeDriver` is not supported",
]);

const POLICY_SUPPORT_EMAIL = "support@agentscottystudio.com";
const ACCOUNT_DELETION_MAILTO =
  `mailto:${POLICY_SUPPORT_EMAIL}?subject=AI%20Menu%20APP%20Account%20Deletion%20Request` +
  "&body=Please%20delete%20my%20AI%20Menu%20APP%20account.%0A%0ARegistered%20email%3A%20%0AUsername%20if%20known%3A%20%0A";

const STATIC_POLICY_ROUTES = {
  "/account-deletion": "account-deletion",
  "/home/privacy-policy": "privacy-policy",
  "/privacy-policy": "privacy-policy",
};

function getStaticPolicyRoute() {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;

  const pathname = window.location?.pathname || "";
  const normalizedPath = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return STATIC_POLICY_ROUTES[normalizedPath] || null;
}

function StaticPolicyPage({ route }) {
  const isAccountDeletion = route === "account-deletion";
  const title = isAccountDeletion ? "Delete your AI Menu APP account" : "Privacy Policy";
  const subtitle = isAccountDeletion
    ? "Request deletion of your account and associated account data."
    : "AI Menu APP - Last updated: June 10, 2026";
  const sections = isAccountDeletion
    ? [
        {
          heading: "How to request deletion",
          items: [
            "Send the request from the email address registered with your account.",
            "Include your registered email and username if available.",
            "We will verify the request and process account deletion.",
          ],
        },
        {
          heading: "Data deleted",
          items: [
            "Account profile data, authentication account, avatar, saved menu history, profile preferences, and saved order list data associated with the account will be deleted where technically feasible.",
          ],
        },
        {
          heading: "Data that may be retained",
          items: [
            "We may retain security logs, transaction records required by law, and anonymized or non-user-linked menu, dish, and image cache data that is no longer associated with your account.",
          ],
        },
      ]
    : [
        {
          heading: "Information we collect",
          items: [
            "Account information, such as username, email address, optional phone number, and authentication identifiers.",
            "Profile preferences, such as dietary preferences, allergies, budget, and taste preferences when users choose to provide them.",
            "User-provided menu content, including menu photos, PDFs, documents, text, webpages, and delivery app share links.",
            "Generated menu results, including translated dish names, descriptions, ingredients, allergens, prices, menu history, and order list items.",
            "Technical data such as app interactions, diagnostics, device or advertising identifiers, and network request metadata.",
          ],
        },
        {
          heading: "How we use information",
          items: [
            "To provide menu OCR, translation, dish explanation, image matching, and AI recommendation features.",
            "To save account profiles, menu history, and order list data for signed-in users.",
            "To improve reliability, prevent abuse, debug errors, and maintain app security.",
            "To show advertising and measure ad performance where ads are enabled.",
            "To respond to support, account deletion, and privacy requests.",
          ],
        },
        {
          heading: "Third-party services",
          items: [
            "The app may process data through service providers used for hosting, database storage, authentication, AI model processing, image retrieval, analytics, and advertising.",
            "These providers may include Render, Supabase, OpenRouter, OpenAI, Google AdMob, Pexels, Unsplash, and Wikimedia Commons depending on enabled features.",
          ],
        },
        {
          heading: "Your choices",
          items: [
            "You can avoid signing in and use supported features without an account where available.",
            "You can request account deletion at /account-deletion.",
            "You can contact us for privacy questions or deletion requests.",
          ],
        },
      ];

  return (
    <ScrollView style={policyStyles.screen} contentContainerStyle={policyStyles.container}>
      <View style={policyStyles.card}>
        <Text style={policyStyles.brand}>AI Menu APP</Text>
        <Text style={policyStyles.title}>{title}</Text>
        <Text style={policyStyles.subtitle}>{subtitle}</Text>

        {isAccountDeletion ? (
          <Text
            accessibilityRole="link"
            onPress={() => Linking.openURL(ACCOUNT_DELETION_MAILTO)}
            style={policyStyles.primaryLink}
          >
            Email account deletion request
          </Text>
        ) : (
          <Text style={policyStyles.body}>
            AI Menu APP helps users translate and understand restaurant menus from photos, files,
            documents, and menu links. This Privacy Policy explains what information we collect,
            how we use it, and the choices available to users.
          </Text>
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
          Contact:{" "}
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

function AppContent() {
  const [screen, setScreen] = useState("home");
  const [menuResult, setMenuResult] = useState(null);
  const [targetLang, setTargetLang] = useState(getInitialLanguage());
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [incomingMenuUrl, setIncomingMenuUrl] = useState("");

  useEffect(() => {
    async function initializeApp() {
      // Detect user currency based on IP (non-blocking)
      detectUserCurrency().catch((err) => console.log("Failed to detect user currency:", err));

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
  }, [targetLang, screen, menuResult]);

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

    if (deviceLang === "zh-tw" || deviceLang === "zh-hk" || deviceLang === "zh-hant") {
      setTargetLang("zh-Hant");
    } else if (deviceLang.startsWith("zh")) {
      setTargetLang("zh");
    } else if (deviceLang.startsWith("es")) {
      setTargetLang("es");
    } else {
      setTargetLang("en");
    }

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
    </>
  );
}


const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6750A4",
    onPrimary: "#FFFFFF",
    primaryContainer: "#EADDFF",
    onPrimaryContainer: "#21005D",
    secondaryContainer: "#E8DEF8",
    onSecondaryContainer: "#1D192B",
    surface: "#FDF8F3",
    background: "#FDF8F3",
    onSurface: "#1D1B20",
    outline: "#79747E",
  },
};

export default function App() {
  const staticPolicyRoute = getStaticPolicyRoute();

  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        {staticPolicyRoute ? <StaticPolicyPage route={staticPolicyRoute} /> : <AppContent />}
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
