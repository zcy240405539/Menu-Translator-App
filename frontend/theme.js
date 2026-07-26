import { MD3DarkTheme, MD3LightTheme } from "react-native-paper";

export const THEME_STORAGE_KEY = "menu_app_theme_mode";
export const THEME_MODES = ["system", "light", "dark"];

export const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6750A4",
    onPrimary: "#FFFFFF",
    primaryContainer: "#EADDFF",
    onPrimaryContainer: "#21005D",
    secondaryContainer: "#E8DEF8",
    onSecondaryContainer: "#1D192B",
    surface: "#FFFBFE",
    surfaceVariant: "#F3EDF7",
    background: "#FDF8F3",
    onSurface: "#1D1B20",
    onSurfaceVariant: "#49454F",
    outline: "#79747E",
    outlineVariant: "#CAC4D0",
  },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#D0BCFF",
    onPrimary: "#381E72",
    primaryContainer: "#4F378B",
    onPrimaryContainer: "#EADDFF",
    secondaryContainer: "#4A4458",
    onSecondaryContainer: "#E8DEF8",
    surface: "#1C1B1F",
    surfaceVariant: "#49454F",
    background: "#141218",
    onSurface: "#E6E1E5",
    onSurfaceVariant: "#CAC4D0",
    outline: "#938F99",
    outlineVariant: "#49454F",
  },
};

export function resolveTheme(themeMode, systemColorScheme) {
  return themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark")
    ? darkTheme
    : lightTheme;
}
