const fs = require('fs');
let content = fs.readFileSync('frontend/screens/HomeScreen.js', 'utf8');

const badBlock = `                    anchor={
                      <Button
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

const fixedBlock = `                    anchor={
                      <Button`;

const insertionPoint = `                <View style={styles.inputActions}>
                  <Button
                    mode="contained-tonal"
                    icon="camera-outline"`;

const photoButton = `                <View style={styles.inputActions}>
                  <Button
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
                    icon="camera-outline"`;

content = content.replace(badBlock, fixedBlock);
content = content.replace(insertionPoint, photoButton);
fs.writeFileSync('frontend/screens/HomeScreen.js', content);
