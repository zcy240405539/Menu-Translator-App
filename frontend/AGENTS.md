---
name: build-and-compile-rules
description: Defines rules for local vs cloud compilation.
trigger: always_on
---
# Compilation & Build Rules

1. **Prioritize Local Compilation:** Always prioritize local compilation and running (e.g. `npx expo run:android` or `npx expo run:ios`) over pushing to Expo cloud (EAS Build).
2. **Never Rush EAS Builds:** EAS Cloud builds cost money and build minutes. NEVER automatically trigger an `eas build` without the user's explicit confirmation.
3. **Android is Local Only:** Android versions MUST ALWAYS be compiled locally. Do not use EAS build for Android unless explicitly instructed to do so.
4. **iOS EAS Cloud Requires Consent:** Only when the user explicitly confirms and approves, you may send the iOS version to the EXPO cloud (`eas build --platform ios`).
