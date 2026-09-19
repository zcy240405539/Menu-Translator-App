import assert from "node:assert/strict";
import { isMobileOrTabletBrowser } from "../src/lib/device.ts";

const device = (userAgent, platform = "", maxTouchPoints = 0) => ({ userAgent, platform, maxTouchPoints });

assert.equal(isMobileOrTabletBrowser(device("Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Win32")), false);
assert.equal(isMobileOrTabletBrowser(device("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", "iPhone", 5)), true);
assert.equal(isMobileOrTabletBrowser(device("Mozilla/5.0 (Linux; Android 15; Pixel 9)", "Linux armv8l", 5)), true);
assert.equal(isMobileOrTabletBrowser(device("Mozilla/5.0 (Linux; Android 14; SM-X900)", "Linux armv8l", 5)), true);
assert.equal(isMobileOrTabletBrowser(device("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15)", "MacIntel", 5)), true);

console.log("Device action visibility checks passed.");
