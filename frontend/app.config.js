module.exports = {
  expo: {
    name: "AI Menu APP",
    slug: "ai-menu-app",
    scheme: "aimenuapp",
    version: "1.0.0",
    orientation: "portrait",
    android: {
      package: "com.anonymous.aimenuapp"
    },
    plugins: [
      "expo-localization",
      [
        "react-native-google-mobile-ads",
        {
          "androidAppId": process.env.EXPO_PUBLIC_AD_APP_ID || "ca-app-pub-8286400764174465~6115841032",
          "iosAppId": process.env.EXPO_PUBLIC_AD_APP_ID || "ca-app-pub-8286400764174465~6115841032"
        }
      ]
    ],
    web: {
      favicon: "./assets/favicon.png"
    }
  }
};
