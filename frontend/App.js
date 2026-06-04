import React, { useEffect, useState } from "react";
import * as Localization from "expo-localization";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import HomeScreen from "./screens/HomeScreen";
import MenuResultScreen from "./screens/MenuResultScreen";
import CartScreen from "./screens/CartScreen";
import HistoryScreen from "./screens/HistoryScreen";
import { getInitialLanguage, hasSavedLanguage, getText, getUrlLangParam, mapUrlLangToInternal } from "./i18n";
import { getCachedMenu } from "./api";
import { Platform, Share, Alert } from "react-native";
import ShareDialog from "./components/ShareDialog";

function AppContent() {
  const [screen, setScreen] = useState("home");
  const [menuResult, setMenuResult] = useState(null);
  const [targetLang, setTargetLang] = useState(getInitialLanguage());
  const [languageInitialized, setLanguageInitialized] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location?.search) {
      const params = new URLSearchParams(window.location.search);
      const menuHash = params.get("menu_hash");
      const langParam = params.get("lang") || params.get("target_lang");
      const mappedLang = mapUrlLangToInternal(langParam);

      if (menuHash) {
        const fetchLang = mappedLang || targetLang || "zh";
        getCachedMenu(menuHash, fetchLang)
          .then((data) => {
            setMenuResult(data);
            if (mappedLang) {
              setTargetLang(mappedLang);
            } else {
              setTargetLang(fetchLang);
            }
            setScreen("result");
          })
          .catch((err) => {
            console.log("Failed to load shared menu:", err);
          });
      } else if (mappedLang) {
        setTargetLang(mappedLang);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.history?.replaceState) return;

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

  if (screen === "cart") {
    screenComponent = (
      <CartScreen
        onBack={() => setScreen("home")}
        targetLang={targetLang}
        onOpenHistory={() => setScreen("history")}
        onOpenCart={() => setScreen("cart")}
        onShare={handleShareGlobal}
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
