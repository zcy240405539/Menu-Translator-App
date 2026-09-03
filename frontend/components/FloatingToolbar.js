import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getText } from "../i18n";

export default function FloatingToolbar({
  activeKey,
  targetLang,
  onGoHome,
  onShare,
  onOpenHistory,
  onOpenCart,
  onOpenPreferences,
}) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const labels = getText(targetLang).navigation;
  const items = [
    { key: "home", icon: "home-outline", label: labels.home, onPress: onGoHome },
    { key: "share", icon: "share-variant-outline", label: labels.share, onPress: onShare },
    { key: "history", icon: "history", label: labels.history, onPress: onOpenHistory },
    { key: "cart", icon: "cart-outline", label: labels.cart, onPress: onOpenCart },
    { key: "preferences", icon: "tune-variant", label: labels.preferences, onPress: onOpenPreferences },
  ];

  return (
    <View style={[styles.safeArea, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <Surface
        elevation={5}
        style={[
          styles.toolbar,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
      >
        {items.map((item) => {
          const active = item.key === activeKey;
          const labelColor = theme.dark
            ? "#FFFFFF"
            : active
              ? theme.colors.primary
              : theme.colors.onSurface;

          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={item.label}
              accessibilityState={{ selected: active }}
              onPress={item.onPress}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              <View style={[styles.iconCircle, active && { backgroundColor: theme.colors.primary }]}>
                <MaterialCommunityIcons
                  name={item.icon}
                  size={22}
                  color={active ? theme.colors.onPrimary : labelColor}
                />
              </View>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.72}
                style={[styles.label, { color: labelColor }, active && styles.activeLabel]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </Surface>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    paddingHorizontal: 14,
    paddingTop: 8,
  },
  toolbar: {
    minHeight: 68,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  item: {
    flex: 1,
    minHeight: 52,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: {
    opacity: 0.65,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    width: "100%",
    marginTop: 2,
    paddingHorizontal: 1,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 13,
    fontWeight: "600",
  },
  activeLabel: {
    fontWeight: "800",
  },
});
