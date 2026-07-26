import { createFileRoute } from "@tanstack/react-router";
import { APP_CONFIG } from "@/lib/config/admin-config";

export const Route = createFileRoute("/legal/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — QuestOS" },
      { name: "description", content: "How QuestOS handles your data." },
      { property: "og:title", content: "Privacy Policy — QuestOS" },
      { property: "og:description", content: "How QuestOS handles your data." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-2xl px-5 pt-10 pb-16 md:px-10 md:pt-16">
      <h1 className="font-display text-3xl font-semibold">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {new Date().getFullYear()}</p>

      <h2>What we collect</h2>
      <p>
        QuestOS stores the account information you provide (email, display name), your
        quests, legacy events, achievements, journal entries, character stats, and
        subscription state. We also record anonymous product analytics (event name,
        timestamp, session id) to improve the app.
      </p>

      <h2>What we do not collect</h2>
      <p>
        We do not sell your data. We do not run third-party ad trackers. We do not use
        persistent hardware identifiers such as the Android Advertising ID.
      </p>

      <h2>Payments</h2>
      <p>
        Payments on the web are processed by Stripe. On Android they are processed by
        Google Play Billing (via RevenueCat). QuestOS never sees your full card number.
      </p>

      <h2>AI</h2>
      <p>
        Prompts you send to the AI Coach are transmitted to the Lovable AI Gateway for
        model completion. We do not train models on your data.
      </p>

      <h2>Your rights</h2>
      <p>
        You can export a full JSON snapshot of your data at any time from
        <em> Settings → Data</em>. You can delete your account permanently from the same
        screen. Deletion is irreversible.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href={`mailto:${APP_CONFIG.legal.supportEmail}`}>{APP_CONFIG.legal.supportEmail}</a>.
      </p>
    </article>
  );
}
