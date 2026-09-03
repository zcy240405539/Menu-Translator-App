const {
  AndroidConfig,
  withAndroidManifest,
  withAndroidStyles,
  withAppBuildGradle,
  withGradleProperties
} = require("@expo/config-plugins");

const R8_PROPERTIES = {
  "android.enableMinifyInReleaseBuilds": "true",
  "android.enableShrinkResourcesInReleaseBuilds": "true",
  "android.r8.optimizedResourceShrinking": "true"
};

const OPTIONAL_CAMERA_FEATURES = [
  "android.hardware.camera",
  "android.hardware.camera.autofocus"
];

function withAdaptiveActivity(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(
      androidConfig.modResults
    );

    delete mainActivity.$["android:screenOrientation"];
    mainActivity.$["android:resizeableActivity"] = "true";
    return androidConfig;
  });
}

function withModernSystemBars(config) {
  return withAndroidStyles(config, (androidConfig) => {
    const appTheme = AndroidConfig.Styles.getAppThemeGroup();

    for (const name of [
      "android:statusBarColor",
      "android:navigationBarColor"
    ]) {
      androidConfig.modResults = AndroidConfig.Styles.removeStylesItem({
        name,
        parent: appTheme,
        xml: androidConfig.modResults
      });
    }

    return androidConfig;
  });
}

function withOptionalCameraFeatures(config) {
  return withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;
    const features = manifest["uses-feature"] || [];

    for (const name of OPTIONAL_CAMERA_FEATURES) {
      const feature = features.find((item) => item.$["android:name"] === name);
      if (feature) {
        feature.$["android:required"] = "false";
      } else {
        features.push({
          $: { "android:name": name, "android:required": "false" }
        });
      }
    }

    manifest["uses-feature"] = features;
    return androidConfig;
  });
}

function withR8Properties(config) {
  config = withGradleProperties(config, (androidConfig) => {
    for (const [name, value] of Object.entries(R8_PROPERTIES)) {
      AndroidConfig.BuildProperties.updateAndroidBuildProperty(
        androidConfig.modResults,
        name,
        value
      );
    }

    return androidConfig;
  });

  return withAppBuildGradle(config, (androidConfig) => {
    androidConfig.modResults.contents = androidConfig.modResults.contents.replace(
      /getDefaultProguardFile\(["']proguard-android\.txt["']\)/g,
      'getDefaultProguardFile("proguard-android-optimize.txt")'
    );
    return androidConfig;
  });
}

module.exports = function withAndroidPlayCompliance(config) {
  config = withAdaptiveActivity(config);
  config = withOptionalCameraFeatures(config);
  config = withModernSystemBars(config);
  return withR8Properties(config);
};
