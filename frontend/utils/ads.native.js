import { TestIds, InterstitialAd, AdEventType, BannerAd, BannerAdSize } from "react-native-google-mobile-ads";

// Production IDs provided by the user
const PROD_IDS = {
  interstitial: "ca-app-pub-8286400764174465/4524922148",
  bottomBanner: "ca-app-pub-8286400764174465/4938490733",
  itemBanner: "ca-app-pub-8286400764174465/1866969210",
  recommendInterstitial: "ca-app-pub-8286400764174465/1588487791",
  recommendBanner: "ca-app-pub-8286400764174465/2976715375",
};

// Automatic environment switching based on __DEV__
export const AD_UNIT_IDS = {
  interstitial: __DEV__ ? TestIds.INTERSTITIAL : PROD_IDS.interstitial,
  bottomBanner: __DEV__ ? TestIds.BANNER : PROD_IDS.bottomBanner,
  itemBanner: __DEV__ ? TestIds.BANNER : PROD_IDS.itemBanner,
  recommendInterstitial: __DEV__ ? TestIds.INTERSTITIAL : PROD_IDS.recommendInterstitial,
  recommendBanner: __DEV__ ? TestIds.BANNER : PROD_IDS.recommendBanner,
};

export { InterstitialAd, AdEventType, BannerAd, BannerAdSize };
