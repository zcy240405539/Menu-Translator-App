const fs = require('fs');
let code = fs.readFileSync('frontend/screens/HomeScreen.js', 'utf8');

// Fix 1: Restore the anchor tag mistakenly containing the photo button
code = code.replace(
/anchor=\{\s*<Button\s*mode="contained-tonal"\s*icon="image-outline"[\s\S]*?\{t\.home\.selectFromGallery \|\| "Photo Library"\}\s*<\/Button>\s*<Button/,
"anchor={\n                      <Button"
);

// Fix 2: Inject the photo button before the camera button
code = code.replace(
/<Button\s+mode="contained-tonal"\s+icon="camera-outline"/,
`<Button
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

                  <Button
                    mode="contained-tonal"
                    icon="camera-outline"`
);

fs.writeFileSync('frontend/screens/HomeScreen.js', code);
