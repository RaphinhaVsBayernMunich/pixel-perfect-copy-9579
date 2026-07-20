import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for the QuestOS native Android build.
 *
 * The web app is unaffected by this file — it's only read by `npx cap sync`
 * / Android Studio. The `server.url` field is intentionally empty so the
 * native build ships with the bundled `dist/` webDir. To point a debug
 * build at your local Cloudflare Worker preview during development, set
 * `server.url` to `http://10.0.2.2:8080` for the Android emulator.
 */
const config: CapacitorConfig = {
  appId: "app.questos.android",
  appName: "QuestOS",
  webDir: "dist",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#0b0d13",
      showSpinner: false,
      androidSplashResourceName: "splash",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#f5c26b",
    },
  },
};

export default config;
