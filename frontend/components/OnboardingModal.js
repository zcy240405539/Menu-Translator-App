import React, { useState } from "react";
import { Modal, StyleSheet, View } from "react-native";
import { Button, Icon, Surface, Text, useTheme } from "react-native-paper";
import { getText } from "../i18n";

const ICONS = ["camera-outline", "translate", "food-apple-outline", "lightbulb-on-outline"];

export default function OnboardingModal({ visible, targetLang, onComplete }) {
  const [step, setStep] = useState(0);
  const theme = useTheme();
  const text = getText(targetLang).onboarding;
  const current = text.steps[step];
  const isLast = step === text.steps.length - 1;

  const finish = () => {
    setStep(0);
    onComplete();
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={finish}>
      <Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}>
        <View style={styles.topRow}>
          <Button mode="text" onPress={finish}>{text.skip}</Button>
        </View>

        <View style={styles.body}>
          <View style={[styles.iconStage, { backgroundColor: theme.colors.primaryContainer }]}>
            <Icon source={ICONS[step]} size={88} color={theme.colors.onPrimaryContainer} />
          </View>
          <Text variant="displaySmall" style={styles.title}>{current.title}</Text>
          <Text variant="bodyLarge" style={[styles.description, { color: theme.colors.onSurfaceVariant }]}>
            {current.description}
          </Text>
          <View style={styles.dots}>
            {text.steps.map((item, index) => (
              <View
                key={item.title}
                style={[
                  styles.dot,
                  { backgroundColor: index === step ? theme.colors.primary : theme.colors.outlineVariant },
                ]}
              />
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          {step > 0 ? <Button onPress={() => setStep((value) => value - 1)}>{text.back}</Button> : <View />}
          <Button mode="contained" onPress={() => isLast ? finish() : setStep((value) => value + 1)}>
            {isLast ? text.start : text.next}
          </Button>
        </View>
      </Surface>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 24, paddingVertical: 20 },
  topRow: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center" },
  body: { flex: 1, justifyContent: "center", alignItems: "center", width: "100%", maxWidth: 560, alignSelf: "center" },
  iconStage: { width: 200, height: 200, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 38 },
  title: { textAlign: "center", fontWeight: "800", letterSpacing: 0 },
  description: { marginTop: 18, maxWidth: 420, textAlign: "center", lineHeight: 27 },
  dots: { flexDirection: "row", gap: 8, marginTop: 34 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  actions: { minHeight: 56, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
});
