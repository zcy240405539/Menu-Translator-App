type DeviceNavigator = Pick<Navigator, "userAgent" | "platform" | "maxTouchPoints">;

export function isMobileOrTabletBrowser(navigator: DeviceNavigator) {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}
