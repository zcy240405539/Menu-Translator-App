const fs = require('fs');
let f = fs.readFileSync('screens/HomeScreen.js', 'utf8');

// 1. Imports
f = f.replace('useState }', 'useState, useRef }');
f = f.replace('  ScrollView,', '  ScrollView,\n  KeyboardAvoidingView,');
f = f.replace('import { saveMenuHistory }', 'import { useSafeAreaInsets } from "react-native-safe-area-context";\nimport { saveMenuHistory }');

// 2. Add useRef and insets
f = f.replace('const [menuUrl, setMenuUrl] = useState("");', 'const [menuUrl, setMenuUrl] = useState("");\n  const interstitialRef = useRef(null);\n  const insets = useSafeAreaInsets();');

// 3. Fix Ad Garbage Collection (Bug #9)
f = f.replace('const interstitial = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);', 'interstitialRef.current = InterstitialAd.createForAdRequest(AD_UNIT_IDS.interstitial);\n        const interstitial = interstitialRef.current;');

// 4. Wrap ScrollView in KeyboardAvoidingView and apply insets
f = f.replace(/<Surface style=\{\[styles\.screen.*?\]\}>/, `<Surface style={[styles.screen, isDesktopLayout && styles.screenDesktop, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>\n      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>`);

f = f.replace(/<\/ScrollView>\s+<FloatingToolbar/m, `</ScrollView>\n      </KeyboardAvoidingView>\n\n      <FloatingToolbar`);

// 5. Add Photo Library Function
const photoLibCode = `
  const selectFromPhotoLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(t.home.permissionRequired || "Permission Required", "Photo library permission is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.4,
      allowsEditing: false,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setSelectedFile({
        uri: asset.uri,
        name: asset.fileName || "library-menu.jpg",
        mimeType: asset.mimeType || "image/jpeg",
      });
      setImageUri(asset.uri);
      setMenuUrl("");
    }
  };

  const takePicture = async () => {`;

f = f.replace('  const takePicture = async () => {', photoLibCode);

// 6. Add Button to UI
const buttonCode = `                  <Button
                    mode="contained-tonal"
                    icon="image-outline"
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                    buttonColor="#EADDFF"
                    textColor="#21005D"
                    onPress={selectFromPhotoLibrary}
                    disabled={loading}
                  >
                    {t.home.selectFromGallery || "Photo Library"}
                  </Button>

                  <Button`;

f = f.replace('                  <Button', buttonCode);

fs.writeFileSync('screens/HomeScreen.js', f);
