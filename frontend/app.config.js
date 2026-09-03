const ANDROID_AD_APP_ID = "ca-app-pub-8286400764174465~6115841032";
const GOOGLE_IOS_TEST_APP_ID = "ca-app-pub-3940256099942544~1458002511";
const APP_VERSION = process.env.APP_VERSION || "2.4";
const googleMobileAdsPlugin = [
  "react-native-google-mobile-ads",
  {
    androidAppId: process.env.EXPO_PUBLIC_AD_APP_ID || ANDROID_AD_APP_ID,
    iosAppId: process.env.EXPO_PUBLIC_IOS_AD_APP_ID || GOOGLE_IOS_TEST_APP_ID,
    delayAppMeasurementInit: true,
    userTrackingUsageDescription: "Your device identifier may be used to show and measure relevant ads when you allow tracking."
  }
];

module.exports = {
  expo: {
    name: "AI Menu APP",
    slug: "ai-menu-app",
    owner: "scottz1995",
    scheme: "aimenuapp",
    version: APP_VERSION,
    orientation: "portrait",
    icon: "./assets/favicon.png",
    android: {
      package: "com.agentscottystudio.aimenuapp",
      versionCode: 7,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FFFFFF"
      },
      blockedPermissions: [
        "android.permission.RECORD_AUDIO",
        "android.permission.SYSTEM_ALERT_WINDOW"
      ]
    },
    ios: {
      bundleIdentifier: "com.agentscottystudio.aimenuapp",
      icon: "./assets/ios-icon.png",
      supportsTablet: false,
      usesAppleSignIn: true,
      config: {
        usesNonExemptEncryption: false
      },
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: false
        }
      }
    },
    plugins: [
      "expo-localization",
      "expo-font",
      "expo-apple-authentication",
      [
        "expo-image-picker",
        {
          "microphonePermission": false
        }
      ],
      googleMobileAdsPlugin,
      "./plugins/withAndroidPlayCompliance"
    ],
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      eas: {
        projectId: "7009b713-84d5-4a8a-8662-39573cd01e1c"
      }
    }
  }
};
