import { Platform } from "react-native";
import {
  TestIds,
  InterstitialAd as NativeInterstitialAd,
  AdEventType,
  BannerAd as NativeBannerAd,
  BannerAdSize,
} from "react-native-google-mobile-ads";

const ANDROID_PROD_IDS = {
  interstitial: "ca-app-pub-8286400764174465/4524922148",
  bottomBanner: "ca-app-pub-8286400764174465/4938490733",
  itemBanner: "ca-app-pub-8286400764174465/1866969210",
  recommendInterstitial: "ca-app-pub-8286400764174465/1588487791",
  recommendBanner: "ca-app-pub-8286400764174465/2976715375",
};

const IOS_PROD_IDS = {
  interstitial: process.env.EXPO_PUBLIC_IOS_AD_INTERSTITIAL_ID,
  bottomBanner: process.env.EXPO_PUBLIC_IOS_AD_BOTTOM_BANNER_ID,
  itemBanner: process.env.EXPO_PUBLIC_IOS_AD_ITEM_BANNER_ID,
  recommendInterstitial: process.env.EXPO_PUBLIC_IOS_AD_RECOMMEND_INTERSTITIAL_ID,
  recommendBanner: process.env.EXPO_PUBLIC_IOS_AD_RECOMMEND_BANNER_ID,
};

const iosAdsConfigured =
  process.env.EXPO_PUBLIC_IOS_ADS_ENABLED === "true" &&
  Object.values(IOS_PROD_IDS).every(Boolean);
const adsEnabled = Platform.OS !== "ios" || iosAdsConfigured;
const productionIds = Platform.OS === "ios" ? IOS_PROD_IDS : ANDROID_PROD_IDS;

export const AD_UNIT_IDS = {
  interstitial: __DEV__ || !adsEnabled ? TestIds.INTERSTITIAL : productionIds.interstitial,
  bottomBanner: __DEV__ || !adsEnabled ? TestIds.BANNER : productionIds.bottomBanner,
  itemBanner: __DEV__ || !adsEnabled ? TestIds.BANNER : productionIds.itemBanner,
  recommendInterstitial: __DEV__ || !adsEnabled ? TestIds.INTERSTITIAL : productionIds.recommendInterstitial,
  recommendBanner: __DEV__ || !adsEnabled ? TestIds.BANNER : productionIds.recommendBanner,
};

export const InterstitialAd = adsEnabled ? NativeInterstitialAd : null;
export const BannerAd = adsEnabled ? NativeBannerAd : null;
export { AdEventType, BannerAdSize };
