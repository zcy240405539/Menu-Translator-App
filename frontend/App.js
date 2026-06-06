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
import { getCachedMenu, setAuthToken, getProfile } from "./api";
import { Platform, Share, Alert } from "react-native";
import { detectUserCurrency } from "./utils/price";
import ShareDialog from "./components/ShareDialog";
import LoginRegisterModal from "./components/LoginRegisterModal";
import AccountProfileModal from "./components/AccountProfileModal";

function AppContent() {
  const [screen, setScreen] = useState("home");
  const [menuResult, setMenuResult] = useState(null);
  const [targetLang, setTargetLang] = useState(getInitialLanguage());
  const [languageInitialized, setLanguageInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  useEffect(() => {
    async function initializeApp() {
      // Detect user currency based on IP
      await detectUserCurrency().catch((err) => console.log("Failed to detect user currency:", err));

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
        } else if (mappedLang) {
          setTargetLang(mappedLang);
        }
      }
    }
    initializeApp();
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
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AppContent />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
