import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Bell,
  Bot,
  CreditCard,
  Download,
  FileText,
  Globe,
  Palette,
  ShieldAlert,
  Sparkles,
  Volume2,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { SubscriptionSection } from "@/components/subscription/subscription-section";
import { useSettings, type LanguagePref, type SoundPack, type ThemePref } from "@/lib/settings-store";
import { exportUserData, deleteAccount } from "@/lib/data.functions";
import { track } from "@/lib/analytics";
import { APP_CONFIG } from "@/lib/config/admin-config";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — QuestOS" },
      { name: "description", content: "Manage your QuestOS subscription, notifications, AI, appearance and data." },
      { property: "og:title", content: "Settings — QuestOS" },
      { property: "og:description", content: "Manage your QuestOS subscription, notifications, AI, appearance and data." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-8 pb-16 md:px-10 md:pt-12">
      <header className="mb-8">
        <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">
          Preferences
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Settings</h1>
      </header>

      <div className="space-y-6">
        {/* Subscription */}
        <SubscriptionSection />

        <NotificationsCard />
        <AiPreferencesCard />
        <AppearanceCard />
        <LanguageCard />
        <DataCard />
        <LegalCard />
        <DangerZone />
      </div>
    </div>
  );
}

function Card({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-hairline bg-card/60 p-6 backdrop-blur-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold">{title}</h2>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function NotificationsCard() {
  const settings = useSettings((s) => s.settings);
  const patch = useSettings((s) => s.patch);

  const rows: { key: keyof typeof settings.notifications; label: string; description: string }[] = [
    { key: "trialReminders", label: "Trial reminders", description: "Nudges before your trial ends." },
    { key: "billing", label: "Billing alerts", description: "Renewals, failures, cancellations." },
    { key: "achievements", label: "Achievements", description: "New trophies and level-ups." },
    { key: "dailyBrief", label: "Daily brief", description: "Morning AI brief when you open the app." },
  ];

  return (
    <Card icon={<Bell className="h-4 w-4" />} title="Notifications" description="Choose which alerts QuestOS can send.">
      <div className="divide-y divide-hairline">
        {rows.map((row) => (
          <label key={row.key} className="flex items-center justify-between gap-4 py-3">
            <div>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.description}</p>
            </div>
            <Switch
              checked={settings.notifications[row.key]}
              onCheckedChange={(v) => patch({ notifications: { ...settings.notifications, [row.key]: v } })}
            />
          </label>
        ))}
      </div>
    </Card>
  );
}

function AiPreferencesCard() {
  const settings = useSettings((s) => s.settings);
  const set = useSettings((s) => s.set);
  return (
    <Card icon={<Bot className="h-4 w-4" />} title="AI Coach" description="How your Coach speaks and remembers.">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Tone</p>
          <div className="flex gap-2">
            {(["warm", "sharp", "playful"] as const).map((t) => (
              <button
                key={t}
                onClick={() => set("ai", { ...settings.ai, tone: t })}
                className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
                  settings.ai.tone === t ? "border-primary bg-primary/10 text-primary" : "border-hairline"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <label className="flex items-center justify-between gap-4 border-t border-hairline pt-4">
          <div>
            <p className="text-sm font-medium">Memory</p>
            <p className="text-xs text-muted-foreground">Let the Coach remember patterns across sessions.</p>
          </div>
          <Switch
            checked={settings.ai.memoryEnabled}
            onCheckedChange={(v) => set("ai", { ...settings.ai, memoryEnabled: v })}
          />
        </label>
        <p className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Daily AI limit — Free: {APP_CONFIG.aiQuota.free} · Trial: {APP_CONFIG.aiQuota.trial} ·
          Premium: {APP_CONFIG.aiQuota.premium ?? "unlimited"}
        </p>
      </div>
    </Card>
  );
}

function AppearanceCard() {
  const settings = useSettings((s) => s.settings);
  const set = useSettings((s) => s.set);
  const themes: ThemePref[] = ["dark", "light", "system"];
  const sounds: { id: SoundPack; label: string }[] = [
    { id: "default", label: "Default" },
    { id: "gta_sa", label: "GTA SA Passed" },
    { id: "minimal", label: "Minimal" },
    { id: "silent", label: "Silent" },
  ];
  return (
    <Card icon={<Palette className="h-4 w-4" />} title="Appearance" description="Theme and sound pack.">
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Theme</p>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t}
                onClick={() => set("theme", t)}
                className={`rounded-lg border px-3 py-1.5 text-sm capitalize ${
                  settings.theme === t ? "border-primary bg-primary/10 text-primary" : "border-hairline"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Volume2 className="h-3 w-3" /> Sound pack
          </p>
          <div className="flex flex-wrap gap-2">
            {sounds.map((s) => (
              <button
                key={s.id}
                onClick={() => set("soundPack", s.id)}
                className={`rounded-lg border px-3 py-1.5 text-sm ${
                  settings.soundPack === s.id ? "border-primary bg-primary/10 text-primary" : "border-hairline"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function LanguageCard() {
  const settings = useSettings((s) => s.settings);
  const set = useSettings((s) => s.set);
  const languages: { id: LanguagePref; label: string }[] = [
    { id: "en", label: "English" },
    { id: "es", label: "Español" },
    { id: "fr", label: "Français" },
    { id: "de", label: "Deutsch" },
    { id: "pt", label: "Português" },
    { id: "ja", label: "日本語" },
  ];
  return (
    <Card icon={<Globe className="h-4 w-4" />} title="Language" description="Translations roll out progressively.">
      <select
        value={settings.language}
        onChange={(e) => set("language", e.target.value as LanguagePref)}
        className="w-full rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
      >
        {languages.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </Card>
  );
}

function DataCard() {
  const [exporting, setExporting] = useState(false);
  const developerMode = useSettings((s) => s.settings.developerMode);
  const set = useSettings((s) => s.set);
  const [tapCount, setTapCount] = useState(0);

  async function handleExport() {
    setExporting(true);
    try {
      const data = await exportUserData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `questos-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      track("data_exported");
      toast.success("Export downloaded.");
    } catch (e: any) {
      toast.error(e?.message ?? "Export failed");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card
      icon={<Download className="h-4 w-4" />}
      title="Your data"
      description="Take your QuestOS with you. Nothing is ever deleted without your say-so."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleExport} disabled={exporting} className="gap-1.5">
          <Download className="h-4 w-4" />
          {exporting ? "Exporting…" : "Export data (JSON)"}
        </Button>
        <button
          onClick={() => {
            const next = tapCount + 1;
            setTapCount(next);
            if (next >= 7) {
              set("developerMode", !developerMode);
              toast.info(`Developer mode ${!developerMode ? "on" : "off"}`);
              setTapCount(0);
            }
          }}
          className="rounded-lg border border-transparent px-3 py-1.5 text-xs text-muted-foreground hover:border-hairline"
        >
          Build · {import.meta.env.MODE}
        </button>
      </div>
      {developerMode && (
        <div className="mt-4 rounded-lg border border-hairline bg-muted/30 p-3 text-xs">
          <p className="mb-1 flex items-center gap-1.5 font-medium">
            <Wrench className="h-3 w-3" /> Developer mode
          </p>
          <p className="text-muted-foreground">
            Verbose console logging and analytics debug are enabled for this session.
          </p>
        </div>
      )}
    </Card>
  );
}

function LegalCard() {
  return (
    <Card icon={<FileText className="h-4 w-4" />} title="Legal">
      <div className="flex flex-wrap gap-2 text-sm">
        <a href={APP_CONFIG.legal.privacyUrl} className="text-primary hover:underline">
          Privacy Policy
        </a>
        <span className="text-muted-foreground">·</span>
        <a href={APP_CONFIG.legal.termsUrl} className="text-primary hover:underline">
          Terms of Service
        </a>
        <span className="text-muted-foreground">·</span>
        <a href={`mailto:${APP_CONFIG.legal.supportEmail}`} className="text-primary hover:underline">
          Support
        </a>
      </div>
    </Card>
  );
}

function DangerZone() {
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    try {
      await deleteAccount({ data: { confirm: "DELETE" } });
      track("account_deleted");
      toast.success("Account deleted. Signing out…");
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e: any) {
      toast.error(e?.message ?? "Deletion failed");
      setDeleting(false);
    }
  }

  return (
    <section className="rounded-3xl border border-destructive/40 bg-destructive/5 p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-destructive/20 text-destructive">
          <ShieldAlert className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-base font-semibold text-destructive">Delete account</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Permanently removes your account, quests, legacy, achievements and settings.
            This cannot be undone.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder='Type "DELETE" to confirm'
          className="flex-1 min-w-[220px] rounded-lg border border-hairline bg-background px-3 py-2 text-sm"
        />
        <Button
          variant="destructive"
          disabled={confirm !== "DELETE" || deleting}
          onClick={handleDelete}
        >
          {deleting ? "Deleting…" : "Delete forever"}
        </Button>
      </div>
    </section>
  );
}
