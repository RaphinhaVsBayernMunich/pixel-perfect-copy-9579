import { validateRuntimeOrigin } from "./scripts/runtime-origin.mjs";
import type { CapacitorConfig } from "@capacitor/cli";
// TanStack's server functions need the deployed HTTPS runtime. The bundled shell
// handles offline startup; no secret or service-role key belongs in this config.
const rawOrigin = process.env.CAPACITOR_SERVER_URL;
const origin = rawOrigin ? validateRuntimeOrigin(rawOrigin) : undefined;
const config: CapacitorConfig = {
  appId: "app.questos.android",
  appName: "QuestOS",
  webDir: "native-shell",
  server: origin ? { url: new URL(origin).origin, cleartext: false } : undefined,
  android: { allowMixedContent: false, webContentsDebuggingEnabled: false },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1200,
      backgroundColor: "#161821",
      androidSplashResourceName: "questos_splash",
      showSpinner: false,
    },
  },
};
export default config;
