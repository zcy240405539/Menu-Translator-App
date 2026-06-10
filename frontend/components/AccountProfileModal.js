import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Image,
  Linking,
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
  ActivityIndicator,
} from "react-native-paper";
import * as ImagePicker from "expo-image-picker";
import { updateProfile, uploadAvatar, logout } from "../api";
import { isChineseLanguage, getText } from "../i18n";

const DIET_OPTIONS = [
  { key: "Vegetarian", labelEn: "Vegetarian", labelZh: "素食", labelEs: "Vegetariano" },
  { key: "Halal", labelEn: "Halal", labelZh: "清真", labelEs: "Halal" },
  { key: "Kosher", labelEn: "Kosher", labelZh: "犹太", labelEs: "Kosher" },
  { key: "Keto", labelEn: "Keto", labelZh: "生酮", labelEs: "Keto" },
  { key: "Gluten-Free", labelEn: "Gluten-Free", labelZh: "无麸质", labelEs: "Sin Gluten" },
];

const ACCOUNT_DELETION_URL = `${
  process.env.EXPO_PUBLIC_API_BASE_URL || "https://ai-menu-app.onrender.com"
}`.replace(/\/$/, "") + "/account-deletion";

export default function AccountProfileModal({
  visible,
  currentUser,
  targetLang,
  onClose,
  onUpdateUser,
  onLogout,
}) {
  const [phone, setPhone] = useState("");
  const [selectedDiets, setSelectedDiets] = useState([]);
  const [allergiesText, setAllergiesText] = useState("");
  const [budget, setBudget] = useState("");
  const [taste, setTaste] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isZh = isChineseLanguage(targetLang);

  const t = getText(targetLang).profile || {};
  const authText = getText(targetLang).auth || {};

  // Populate state when user logs in or profile opens
  useEffect(() => {
    if (currentUser) {
      setPhone(currentUser.phone || "");
      setSelectedDiets(currentUser.diets || []);
      setAllergiesText(currentUser.allergies ? currentUser.allergies.join(", ") : "");
      setBudget(currentUser.budget || "");
      setTaste(currentUser.taste || "");
      setError("");
      setSuccess("");
    }
  }, [currentUser, visible]);

  const handleDietToggle = (dietKey) => {
    if (selectedDiets.includes(dietKey)) {
      setSelectedDiets(selectedDiets.filter((k) => k !== dietKey));
    } else {
      setSelectedDiets([...selectedDiets, dietKey]);
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    const allergies = allergiesText
      ? allergiesText.split(/[,，]/).map((s) => s.trim()).filter(Boolean)
      : [];

    try {
      const updated = await updateProfile({
        phone: phone || null,
        diets: selectedDiets,
        allergies,
        budget: budget || null,
        taste: taste || null,
      });
      onUpdateUser(updated);
      setSuccess(t.successMsg);
    } catch (err) {
      setError(err.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAvatar = async () => {
    setError("");
    setSuccess("");
    
    // Request permission
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      setError(authText.mediaLibraryPermission || "Permission to access media library is required");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        setAvatarLoading(true);
        const uploadRes = await uploadAvatar({
          uri: selectedAsset.uri,
          name: "avatar.jpg",
          type: "image/jpeg",
        });

        // Update local user state
        onUpdateUser({
          ...currentUser,
          avatar_url: uploadRes.avatar_url,
        });
        
        setSuccess(authText.avatarSuccess || "Avatar updated successfully!");
      }
    } catch (err) {
      console.warn("Avatar selection/upload failed:", err);
      setError(authText.avatarFail || "Avatar upload failed.");
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
      onLogout();
      onClose();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAccountDeletion = async () => {
    try {
      await Linking.openURL(ACCOUNT_DELETION_URL);
    } catch (err) {
      console.warn("Open account deletion link failed:", err);
      setError(t.deleteAccountOpenFailed || "Unable to open account deletion page.");
    }
  };

  if (!currentUser) return null;

  return (
    <Portal>
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <Surface style={styles.screen}>
          <Appbar.Header style={styles.appbar} mode="center-aligned">
            <Appbar.BackAction onPress={onClose} />
            <Appbar.Content title={t.title} titleStyle={styles.appbarTitle} />
          </Appbar.Header>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.keyboardView}
          >
            <ScrollView contentContainerStyle={styles.content}>
              {/* Profile Card */}
              <Card style={styles.card} mode="contained">
                <Card.Content style={styles.cardContent}>
                  
                  {/* Avatar section */}
                  <View style={styles.avatarSection}>
                    <TouchableOpacity onPress={handleSelectAvatar} activeOpacity={0.8} style={styles.avatarWrapper}>
                      {currentUser.avatar_url ? (
                        <Image source={{ uri: currentUser.avatar_url }} style={styles.avatarImage} />
                      ) : (
                        <IconButton icon="account" size={72} style={styles.avatarPlaceholder} />
                      )}
                      
                      {avatarLoading && (
                        <View style={styles.avatarLoadingOverlay}>
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                    <Text variant="bodySmall" style={styles.avatarTip}>
                      {t.avatarTip}
                    </Text>
                  </View>

                  {/* Username & Email (read-only) */}
                  <View style={styles.readOnlyField}>
                    <Text variant="titleSmall" style={styles.readOnlyLabel}>{t.username}</Text>
                    <Text variant="bodyLarge" style={styles.readOnlyValue}>{currentUser.username}</Text>
                  </View>

                  <View style={styles.readOnlyField}>
                    <Text variant="titleSmall" style={styles.readOnlyLabel}>{t.email}</Text>
                    <Text variant="bodyLarge" style={styles.readOnlyValue}>{currentUser.email}</Text>
                  </View>

                  <Divider style={styles.cardDivider} />

                  {/* Status Messages */}
                  {!!error && <Text style={styles.errorText}>⚠️ {error}</Text>}
                  {!!success && <Text style={styles.successText}>✅ {success}</Text>}

                  {/* Editable Preference Fields */}
                  <TextInput
                    label={t.phone}
                    mode="outlined"
                    value={phone}
                    onChangeText={setPhone}
                    keyboardType="phone-pad"
                    style={styles.input}
                    left={<TextInput.Icon icon="phone" />}
                  />

                  {/* Diet habits */}
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
                          {isZh ? diet.labelZh : diet.labelEn}
                        </Chip>
                      );
                    })}
                  </View>

                  {/* Allergies text input */}
                  <Text style={styles.prefLabel}>{t.allergies}</Text>
                  <TextInput
                    mode="outlined"
                    placeholder={t.allergiesPlaceholder}
                    value={allergiesText}
                    onChangeText={setAllergiesText}
                    style={styles.input}
                    left={<TextInput.Icon icon="alert-circle-outline" />}
                  />

                  {/* Budget */}
                  <Text style={styles.prefLabel}>{t.budget}</Text>
                  <TextInput
                    mode="outlined"
                    placeholder={t.budgetPlaceholder}
                    value={budget}
                    onChangeText={setBudget}
                    style={styles.input}
                    left={<TextInput.Icon icon="currency-usd" />}
                  />

                  {/* Taste */}
                  <Text style={styles.prefLabel}>{t.taste}</Text>
                  <TextInput
                    mode="outlined"
                    placeholder={t.tastePlaceholder}
                    value={taste}
                    onChangeText={setTaste}
                    style={styles.input}
                    left={<TextInput.Icon icon="silverware-fork-knife" />}
                  />

                  {/* Buttons */}
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading || avatarLoading}
                    style={styles.saveBtn}
                    contentStyle={styles.btnContent}
                  >
                    {t.saveBtn}
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={handleLogout}
                    disabled={loading || avatarLoading}
                    icon="logout"
                    style={styles.logoutBtn}
                    contentStyle={styles.btnContent}
                    textColor="#B3261E"
                  >
                    {t.logoutBtn}
                  </Button>

                  <Divider style={styles.deleteDivider} />

                  <View style={styles.deleteAccountSection}>
                    <Text variant="bodySmall" style={styles.deleteAccountHelp}>
                      {t.deleteAccountHelp}
                    </Text>
                    <Button
                      mode="text"
                      onPress={handleOpenAccountDeletion}
                      disabled={loading || avatarLoading}
                      icon="account-remove-outline"
                      textColor="#B3261E"
                      style={styles.deleteAccountBtn}
                    >
                      {t.deleteAccountLink}
                    </Button>
                  </View>

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
    paddingVertical: 14,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#FAF7FB",
    borderWidth: 1,
    borderColor: "#EADDFF",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    margin: 0,
    backgroundColor: "#FAF7FB",
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarTip: {
    color: "#6750A4",
    marginTop: 6,
    fontWeight: "600",
  },
  readOnlyField: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  readOnlyLabel: {
    fontSize: 12,
    color: "#49454F",
    fontWeight: "700",
  },
  readOnlyValue: {
    fontSize: 16,
    color: "#1C1B1F",
    marginTop: 2,
  },
  cardDivider: {
    marginVertical: 14,
  },
  input: {
    marginBottom: 10,
    backgroundColor: "#FFFFFF",
  },
  prefLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D1B20",
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dietChip: {
    backgroundColor: "#F3EDF7",
  },
  dietChipSelected: {
    backgroundColor: "#6750A4",
  },
  saveBtn: {
    marginTop: 22,
    borderRadius: 100,
    backgroundColor: "#6750A4",
  },
  logoutBtn: {
    marginTop: 12,
    borderRadius: 100,
    borderColor: "#B3261E",
  },
  deleteDivider: {
    marginTop: 18,
    marginBottom: 12,
  },
  deleteAccountSection: {
    alignItems: "center",
  },
  deleteAccountHelp: {
    color: "#625B71",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  deleteAccountBtn: {
    borderRadius: 100,
  },
  btnContent: {
    height: 52,
  },
  errorText: {
    color: "#B3261E",
    backgroundColor: "#F9DEDC",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  successText: {
    color: "#146C43",
    backgroundColor: "#D1E7DD",
    padding: 10,
    borderRadius: 12,
    marginBottom: 14,
    fontWeight: "600",
    textAlign: "center",
  },
});
