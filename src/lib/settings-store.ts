/**
 * User settings — persisted to `profiles.settings` (JSONB) via the
 * settings server functions, and mirrored in Zustand for fast reads.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { saveSettings } from "@/lib/settings.functions";
import { track } from "@/lib/analytics";

export type ThemePref = "dark" | "light" | "system";
export type SoundPack = "default" | "gta_sa" | "minimal" | "silent";
export type LanguagePref = "en" | "es" | "fr" | "de" | "pt" | "ja";

export interface UserSettings {
  theme: ThemePref;
  soundPack: SoundPack;
  language: LanguagePref;
  notifications: {
    trialReminders: boolean;
    achievements: boolean;
    dailyBrief: boolean;
    billing: boolean;
  };
  ai: {
    tone: "warm" | "sharp" | "playful";
    memoryEnabled: boolean;
  };
  developerMode: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "dark",
  soundPack: "default",
  language: "en",
  notifications: {
    trialReminders: true,
    achievements: true,
    dailyBrief: true,
    billing: true,
  },
  ai: {
    tone: "warm",
    memoryEnabled: true,
  },
  developerMode: false,
};

interface SettingsStore {
  settings: UserSettings;
  loaded: boolean;
  set: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
  patch: (partial: Partial<UserSettings>) => void;
  hydrate: (remote: Partial<UserSettings> | null) => void;
}

export const useSettings = create<SettingsStore>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      loaded: false,
      set: (key, value) => {
        const next = { ...get().settings, [key]: value };
        set({ settings: next });
        track("settings_changed", { key });
        void saveSettings({ data: { settings: next } }).catch(() => {});
      },
      patch: (partial) => {
        const next = { ...get().settings, ...partial };
        set({ settings: next });
        track("settings_changed", { keys: Object.keys(partial) });
        void saveSettings({ data: { settings: next } }).catch(() => {});
      },
      hydrate: (remote) => {
        set({
          settings: { ...DEFAULT_SETTINGS, ...(remote ?? {}) } as UserSettings,
          loaded: true,
        });
      },
    }),
    { name: "questos.settings" },
  ),
);
