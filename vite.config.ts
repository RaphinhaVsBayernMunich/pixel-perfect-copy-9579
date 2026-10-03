import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: ["react", "react-dom", "@tanstack/react-router"],
  },
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    nitro({
      preset: "cloudflare-module",
      compatibilityDate: "2026-10-02",
      cloudflare: { nodeCompat: true, deployConfig: true },
    }),
    react(),
    tailwindcss(),
  ],
});
