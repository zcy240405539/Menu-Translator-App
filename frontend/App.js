import React, { useEffect, useState } from "react";
import * as Localization from "expo-localization";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import HomeScreen from "./screens/HomeScreen";
import MenuResultScreen from "./screens/MenuResultScreen";
import CartScreen from "./screens/CartScreen";
import HistoryScreen from "./screens/HistoryScreen";

function AppContent() {
  const [screen, setScreen] = useState("home");
  const [menuResult, setMenuResult] = useState(null);
  const [targetLang, setTargetLang] = useState("zh");
  const [languageInitialized, setLanguageInitialized] = useState(false);

  useEffect(() => {
    if (languageInitialized) return;

    const locales = Localization.getLocales?.();
    const deviceLang = locales?.[0]?.languageCode || Localization.locale || "en";

    if (deviceLang.toLowerCase().startsWith("zh")) {
      setTargetLang("zh");
    } else {
      setTargetLang("en");
    }

    setLanguageInitialized(true);
  }, [languageInitialized]);

  if (screen === "cart") {
    return (
      <CartScreen
        onBack={() => setScreen("home")}
        targetLang={targetLang}
      />
    );
  }

  if (screen === "history") {
    return (
      <HistoryScreen
        targetLang={targetLang}
        onBack={() => setScreen("home")}
        onOpenMenu={(record) => {
          setMenuResult(record.raw || record);
          setTargetLang(record.targetLang || targetLang);
          setScreen("result");
        }}
      />
    );
  }

  if (screen === "result" && menuResult) {
    return (
      <MenuResultScreen
        menuResult={menuResult}
        targetLang={targetLang}
        onBack={() => setScreen("home")}
        onOpenCart={() => setScreen("cart")}
      />
    );
  }

  return (
    <HomeScreen
      targetLang={targetLang}
      setTargetLang={setTargetLang}
      onMenuParsed={(data) => {
        setMenuResult(data);
        setScreen("result");
      }}
      onOpenCart={() => setScreen("cart")}
      onOpenHistory={() => setScreen("history")}
    />
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