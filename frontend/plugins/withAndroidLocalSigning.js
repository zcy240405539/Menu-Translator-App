const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withAndroidLocalSigning(config) {
  if (process.env.AIMENU_ANDROID_LOCAL_SIGNING !== "1") return config;

  return withAppBuildGradle(config, (androidConfig) => {
    let contents = androidConfig.modResults.contents;
    if (contents.includes("AIMENU_LOCAL_RELEASE_SIGNING")) return androidConfig;

    const signingBlock = /(\n    signingConfigs \{\n        debug \{[\s\S]*?\n        \}\n)(    \})/;
    if (!signingBlock.test(contents)) {
      throw new Error("Could not locate Android signingConfigs in generated build.gradle");
    }
    contents = contents.replace(signingBlock, `$1        // AIMENU_LOCAL_RELEASE_SIGNING
        localRelease {
            storeFile file(System.getenv("AIMENU_KEYSTORE_PATH"))
            storePassword System.getenv("AIMENU_KEYSTORE_PASSWORD")
            keyAlias System.getenv("AIMENU_KEY_ALIAS")
            keyPassword System.getenv("AIMENU_KEY_PASSWORD")
        }
$2`);

    const releaseSigning = /(\n        release \{[\s\S]*?\n            signingConfig )signingConfigs\.debug/;
    if (!releaseSigning.test(contents)) {
      throw new Error("Could not locate Android release signingConfig in generated build.gradle");
    }
    contents = contents.replace(releaseSigning, "$1signingConfigs.localRelease");
    androidConfig.modResults.contents = contents;
    return androidConfig;
  });
};
