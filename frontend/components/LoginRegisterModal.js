import React, { useState } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import {
  Appbar,
  Button,
  Card,
  Chip,
  Divider,
  Portal,
  Surface,
  Text,
  TextInput,
  IconButton,
  useTheme,
} from "react-native-paper";
import { login, register, passwordReset, getAppleAuthUrl, getGoogleAuthUrl } from "../api";
import { getText } from "../i18n";

const DIET_OPTIONS = [
  { key: "Vegetarian" },
  { key: "Halal" },
  { key: "Kosher" },
  { key: "Keto" },
  { key: "Gluten-Free" },
];

export default function LoginRegisterModal({ visible, targetLang, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Register fields
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phone, setPhone] = useState("");
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [allergiesText, setAllergiesText] = useState("");
  const [budget, setBudget] = useState("");
  const [taste, setTaste] = useState("");
  
  const [showPreferences, setShowPreferences] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  
  const theme = useTheme();

  const catalog = getText(targetLang);
  const authText = catalog.auth;
  const t = {
    ...authText,
    title: isForgotPassword 
      ? authText.resetPasswordTitle 
      : (isLogin ? authText.signInTitle : authText.signUpTitle),
  };

  const handleDietToggle = (dietKey) => {
    if (selectedDiets.includes(dietKey)) {
      setSelectedDiets(selectedDiets.filter((k) => k !== dietKey));
    } else {
      setSelectedDiets([...selectedDiets, dietKey]);
    }
  };

  const handleResetPassword = async () => {
    setError("");
    setSuccessMessage("");
    if (!email) {
      setError(t.requiredFields);
      return;
    }
    setLoading(true);
    try {
      await passwordReset(email);
      setSuccessMessage(t.resetSuccess);
    } catch (err) {
      setError(err.message || t.resetFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async () => {
    setError("");
    if (!email || !password) {
      setError(t.requiredFields);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const res = await login(email, password);
        onLoginSuccess(res.token, res.user);
        onClose();
      } else {
        if (!username) {
          setError(t.requiredFields);
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError(t.errorMatch);
          setLoading(false);
          return;
        }

        // Parse allergies
        const allergies = allergiesText
          ? allergiesText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
          : [];

        const res = await register(
          username,
          email,
          password,
          phone || null,
          selectedDiets,
          allergies,
          budget || null,
          taste || null,
          targetLang
        );
        onLoginSuccess(res.token, res.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || t.authenticationFailed);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (getAuthUrl, failureMessage) => {
    setError("");
    setLoading(true);
    try {
      let redirectUrl = "aimenuapp://auth/callback";
      if (typeof window !== "undefined" && window.location) {
        redirectUrl = window.location.origin;
      }
      
      const { url } = await getAuthUrl(redirectUrl);
      
      if (Platform.OS === "web" && typeof window !== "undefined") {
        window.location.href = url;
      } else {
        const { Linking } = require("react-native");
        const supported = await Linking.canOpenURL(url);
        if (supported) {
          await Linking.openURL(url);
        } else {
          throw new Error(t.redirectUnsupported);
        }
      }
      onClose();
    } catch (err) {
      setError(err.message || failureMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => handleOAuthLogin(getGoogleAuthUrl, t.googleLoginFailed);
  const handleAppleLogin = () => handleOAuthLogin(getAppleAuthUrl, t.appleLoginFailed);
  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <Surface style={[styles.screen, { backgroundColor: theme.colors.background }]}>
          <Appbar.Header style={[styles.appbar, { backgroundColor: theme.colors.background }]} mode="center-aligned">
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title={t.title} titleStyle={styles.appbarTitle} />
          </Appbar.Header>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardView}
          >
            <ScrollView contentContainerStyle={styles.content}>
              <Card style={[styles.card, { backgroundColor: theme.colors.surface }]} mode="contained">
                <Card.Content style={styles.cardContent}>
                  {/* Switchable logo or text */}
                  <View style={styles.headerArea}>
                    <Text variant="displaySmall" style={styles.brandIcon}>
                      🍽️
                    </Text>
                    <Text variant="titleMedium" style={styles.brandName}>
                      {getText(targetLang).appTitle}
                    </Text>
                  </View>

                  {/* Errors */}
                  {!!error && (
                    <Text style={styles.errorText} variant="bodyMedium">
                      ⚠️ {error}
                    </Text>
                  )}

                  {/* Success messages */}
                  {!!successMessage && (
                    <Text style={styles.successText} variant="bodyMedium">
                      ✅ {successMessage}
                    </Text>
                  )}

                  {isForgotPassword ? (
                    <>
                      <Text style={[styles.instructionText, { color: theme.colors.onSurfaceVariant }]} variant="bodyMedium">
                        {t.resetInstruction}
                      </Text>

                      {/* Email */}
                      <TextInput
                        label={t.email}
                        mode="outlined"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                        left={<TextInput.Icon icon="email" />}
                      />

                      {/* Reset Password Button */}
                      <Button
                        mode="contained"
                        onPress={handleResetPassword}
                        loading={loading}
                        disabled={loading}
                        style={styles.submitBtn}
                        contentStyle={styles.btnContent}
                      >
                        {t.resetBtn}
                      </Button>

                      {/* Return to Login Link */}
                      <TouchableOpacity
                        style={styles.switchLink}
                        onPress={() => {
                          setIsForgotPassword(false);
                          setIsLogin(true);
                          setError("");
                          setSuccessMessage("");
                        }}
                      >
                        <Text variant="bodyMedium" style={styles.switchLinkText}>
                          {t.backToLogin}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {/* Register username field */}
                      {!isLogin && (
                        <TextInput
                          label={t.username}
                          mode="outlined"
                          value={username}
                          onChangeText={setUsername}
                          style={styles.input}
                          left={<TextInput.Icon icon="account" />}
                        />
                      )}

                      {/* Email */}
                      <TextInput
                        label={t.email}
                        mode="outlined"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        style={styles.input}
                        left={<TextInput.Icon icon="email" />}
                      />

                      {/* Password */}
                      <TextInput
                        label={t.password}
                        mode="outlined"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry={!showPassword}
                        style={styles.input}
                        left={<TextInput.Icon icon="lock" />}
                        right={
                          <TextInput.Icon
                            icon={showPassword ? "eye-off" : "eye"}
                            onPress={() => setShowPassword((value) => !value)}
                            forceTextInputFocus={false}
                            accessibilityLabel={showPassword ? t.hidePassword : t.showPassword}
                          />
                        }
                      />

                      {/* Forgot Password Link for Login Mode */}
                      {isLogin && (
                        <TouchableOpacity
                          style={styles.forgotPasswordLink}
                          onPress={() => {
                            setIsForgotPassword(true);
                            setError("");
                            setSuccessMessage("");
                          }}
                        >
                          <Text style={styles.forgotPasswordLinkText}>
                            {t.forgotPasswordLink}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Confirm Password */}
                      {!isLogin && (
                        <>
                          <TextInput
                            label={t.confirmPassword}
                            mode="outlined"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showConfirmPassword}
                            style={styles.input}
                            left={<TextInput.Icon icon="lock-check" />}
                            right={
                              <TextInput.Icon
                                icon={showConfirmPassword ? "eye-off" : "eye"}
                                onPress={() => setShowConfirmPassword((value) => !value)}
                                forceTextInputFocus={false}
                                accessibilityLabel={showConfirmPassword ? t.hidePassword : t.showPassword}
                              />
                            }
                          />
                          <TextInput
                            label={t.phone}
                            mode="outlined"
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                            style={styles.input}
                            left={<TextInput.Icon icon="phone" />}
                          />

                          {/* Expandable preferences */}
                          <TouchableOpacity
                            style={styles.preferencesToggle}
                            onPress={() => setShowPreferences(!showPreferences)}
                            activeOpacity={0.8}
                          >
                            <Text variant="titleSmall" style={styles.prefToggleText}>
                              {t.prefTitle}
                            </Text>
                            <IconButton
                              icon={showPreferences ? "chevron-up" : "chevron-down"}
                              size={20}
                              iconColor="#6750A4"
                            />
                          </TouchableOpacity>

                          {showPreferences && (
                            <View style={styles.preferencesBox}>
                              <Text style={styles.prefLabel}>{t.diets}</Text>
                              <View style={styles.chipRow}>
                                {DIET_OPTIONS.map((diet) => {
                                  const isSelected = selectedDiets.includes(diet.key);
                                  return (
                                    <Chip
                                      key={diet.key}
                                      selected={isSelected}
                                      onPress={() => handleDietToggle(diet.key)}
                                      style={[
                                        styles.dietChip,
                                        isSelected && styles.dietChipSelected,
                                      ]}
                                      selectedColor={isSelected ? "#FFFFFF" : "#625B71"}
                                      showSelectedOverlay
                                    >
                                      {catalog.dietOptions[diet.key]}
                                    </Chip>
                                  );
                                })}
                              </View>

                              <Text style={styles.prefLabel}>{t.allergies}</Text>
                              <TextInput
                                mode="outlined"
                                placeholder={t.allergiesPlaceholder}
                                value={allergiesText}
                                onChangeText={setAllergiesText}
                                style={styles.prefInput}
                              />

                              <Text style={styles.prefLabel}>{t.budget}</Text>
                              <TextInput
                                mode="outlined"
                                placeholder={t.budgetPlaceholder}
                                value={budget}
                                onChangeText={setBudget}
                                style={styles.prefInput}
                              />

                              <Text style={styles.prefLabel}>{t.taste}</Text>
                              <TextInput
                                mode="outlined"
                                placeholder={t.tastePlaceholder}
                                value={taste}
                                onChangeText={setTaste}
                                style={styles.prefInput}
                              />
                            </View>
                          )}
                        </>
                      )}

                      {/* Submit Button */}
                      <Button
                        mode="contained"
                        onPress={handleAuth}
                        loading={loading}
                        disabled={loading}
                        style={styles.submitBtn}
                        contentStyle={styles.btnContent}
                      >
                        {isLogin ? t.loginBtn : t.registerBtn}
                      </Button>

                      {/* Switch Mode Link */}
                      <TouchableOpacity
                        style={styles.switchLink}
                        onPress={() => {
                          setIsLogin(!isLogin);
                          setError("");
                        }}
                      >
                        <Text variant="bodyMedium" style={styles.switchLinkText}>
                          {isLogin ? t.switchRegister : t.switchLogin}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <Divider style={styles.divider} />

                  <Button
                    mode="outlined"
                    icon="google"
                    onPress={handleGoogleLogin}
                    disabled={loading}
                    style={styles.oauthBtn}
                    contentStyle={styles.oauthBtnContent}
                    textColor="#1D1B20"
                  >
                    {t.googleLogin}
                  </Button>

                  <Button
                    mode="contained"
                    icon="apple"
                    onPress={handleAppleLogin}
                    disabled={loading}
                    style={[styles.oauthBtn, styles.appleBtn]}
                    contentStyle={styles.oauthBtnContent}
                    buttonColor="#000000"
                    textColor="#FFFFFF"
                  >
                    {t.appleLogin}
                  </Button>

                </Card.Content>
              </Card>
            </ScrollView>
          </KeyboardAvoidingView>
        </Surface>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FDF8F3",
  },
  appbar: {
    backgroundColor: "#FDF8F3",
  },
  appbarTitle: {
    fontWeight: "700",
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 450,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    elevation: 2,
  },
  cardContent: {
    paddingVertical: 20,
  },
  headerArea: {
    alignItems: "center",
    marginBottom: 20,
  },
  brandIcon: {
    marginBottom: 6,
  },
  brandName: {
    fontWeight: "800",
    color: "#6750A4",
  },
  input: {
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },
  preferencesToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EADDFF",
    backgroundColor: "#FAF7FB",
  },
  prefToggleText: {
    fontWeight: "700",
    color: "#6750A4",
    marginLeft: 8,
  },
  preferencesBox: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#FAF7FB",
    borderWidth: 1,
    borderColor: "#EADDFF",
    marginBottom: 14,
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D1B20",
    marginTop: 10,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },
  dietChip: {
    backgroundColor: "#F3EDF7",
  },
  dietChipSelected: {
    backgroundColor: "#6750A4",
  },
  prefInput: {
    backgroundColor: "#FFFFFF",
    height: 40,
    fontSize: 14,
    marginBottom: 6,
  },
  submitBtn: {
    marginTop: 18,
    borderRadius: 100,
    backgroundColor: "#6750A4",
  },
  btnContent: {
    height: 52,
  },
  switchLink: {
    marginTop: 16,
    alignItems: "center",
  },
  switchLinkText: {
    color: "#6750A4",
    fontWeight: "600",
  },
  divider: {
    marginVertical: 20,
  },
  oauthBtn: {
    borderRadius: 100,
    borderColor: "#79747E",
  },
  oauthBtnContent: {
    height: 52,
  },
  appleBtn: {
    marginTop: 12,
    borderColor: "#000000",
  },
  errorText: {
    color: "#B3261E",
    backgroundColor: "#F9DEDC",
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  successText: {
    color: "#146C43",
    backgroundColor: "#D1E7DD",
    padding: 10,
    borderRadius: 12,
    marginBottom: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  forgotPasswordLink: {
    alignSelf: "flex-end",
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  forgotPasswordLinkText: {
    color: "#6750A4",
    fontWeight: "600",
    fontSize: 14,
  },
  instructionText: {
    color: "#49454F",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  googleModalBox: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    elevation: 8,
  },
  googleModalTitle: {
    fontWeight: "800",
    color: "#1C1B1F",
    textAlign: "center",
    marginBottom: 10,
  },
  dialogDivider: {
    marginBottom: 14,
  },
  googleAccountItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: "#FAF7FB",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#EADDFF",
  },
  accountName: {
    fontWeight: "700",
    fontSize: 14,
    color: "#1D1B20",
  },
  accountEmail: {
    fontSize: 12,
    color: "#49454F",
  },
  googleCloseBtn: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
});
