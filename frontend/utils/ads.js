import { Platform } from "react-native";

// Fallback Test IDs for Web or if library load fails
let TestIds = {
  BANNER: "ca-app-pub-3940256099942544/6300978111",
  INTERSTITIAL: "ca-app-pub-3940256099942544/1033173712",
};

let InterstitialAd = null;
let AdEventType = null;
let BannerAd = null;
let BannerAdSize = null;

if (Platform.OS !== "web") {
  try {
    const MobileAds = require("react-native-google-mobile-ads");
    TestIds = MobileAds.TestIds;
    InterstitialAd = MobileAds.InterstitialAd;
    AdEventType = MobileAds.AdEventType;
    BannerAd = MobileAds.BannerAd;
    BannerAdSize = MobileAds.BannerAdSize;
  } catch (e) {
    console.warn("Failed to load react-native-google-mobile-ads:", e);
  }
}

// Production IDs provided by the user
const PROD_IDS = {
  interstitial: "ca-app-pub-8286400764174465/4524922148",
  bottomBanner: "ca-app-pub-8286400764174465/4938490733",
  itemBanner: "ca-app-pub-8286400764174465/1866969210",
};

// Automatic environment switching based on __DEV__
export const AD_UNIT_IDS = {
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : PROD_IDS.interstitial,
  bottomBanner: __DEV__ ? TestIds.BANNER : PROD_IDS.bottomBanner,
  itemBanner: __DEV__ ? TestIds.BANNER : PROD_IDS.itemBanner,
};

export { InterstitialAd, AdEventType, BannerAd, BannerAdSize };
