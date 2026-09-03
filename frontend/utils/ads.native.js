import { Platform } from "react-native";
import {
  default as mobileAds,
  AdsConsent,
  MaxAdContentRating,
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

const iosAdsConfigured = Object.values(IOS_PROD_IDS).every(Boolean);
const useTestIds = __DEV__ || (Platform.OS === "ios" && !iosAdsConfigured);
const productionIds = Platform.OS === "ios" ? IOS_PROD_IDS : ANDROID_PROD_IDS;

export const AD_UNIT_IDS = {
  interstitial: useTestIds ? TestIds.INTERSTITIAL : productionIds.interstitial,
  bottomBanner: useTestIds ? TestIds.BANNER : productionIds.bottomBanner,
  itemBanner: useTestIds ? TestIds.BANNER : productionIds.itemBanner,
  recommendInterstitial: useTestIds ? TestIds.INTERSTITIAL : productionIds.recommendInterstitial,
  recommendBanner: useTestIds ? TestIds.BANNER : productionIds.recommendBanner,
};

let initializationPromise;

export function initializeAds() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      try {
        await AdsConsent.gatherConsent({ tagForUnderAgeOfConsent: false });
        const consentInfo = await AdsConsent.getConsentInfo();
        if (!consentInfo.canRequestAds) return false;
      } catch (error) {
        const consentInfo = await AdsConsent.getConsentInfo().catch(() => null);
        if (!consentInfo?.canRequestAds) throw error;
      }

      await mobileAds().setRequestConfiguration({
        maxAdContentRating: MaxAdContentRating.G,
        tagForChildDirectedTreatment: false,
        tagForUnderAgeOfConsent: false,
        testDeviceIdentifiers: __DEV__ ? ["EMULATOR"] : [],
      });
      await mobileAds().initialize();
      return true;
    })();
  }
  return initializationPromise;
}

export function showAdPrivacyOptions() {
  return AdsConsent.showPrivacyOptionsForm();
}

export const InterstitialAd = NativeInterstitialAd;
export const BannerAd = NativeBannerAd;
export { AdEventType, BannerAdSize };
