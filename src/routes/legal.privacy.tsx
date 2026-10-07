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
      <p className="text-sm text-muted-foreground">Last updated: 7 October 2026</p>
      <p>
        QuestOS privacy and support contact:{" "}
        <a href="mailto:founder@questos.net">founder@questos.net</a>.
      </p>

      <h2>What we collect</h2>
      <p>
        QuestOS stores the account information you provide (email, display name), your quests,
        legacy events, achievements, journal entries, character stats, and subscription state. We
        also record account-linked product analytics (event name, timestamp, session id, user id) to
        improve the app.
      </p>

      <h2>What we do not collect</h2>
      <p>
        We do not sell your data. We do not run third-party ad trackers. We do not use the Android
        Advertising ID. To limit repeat trials, Android supplies an app-signing-key-scoped device
        identifier; web uses a random installation identifier. The backend stores a server-peppered
        hash for trial-abuse prevention.
      </p>

      <h2>Account and sync</h2>
      <p>
        Supabase provides authentication and the account database. Your device keeps an
        account-scoped local save for recovery. Signing out clears the visible session; local
        backups stay on that device until you clear site or app data. Conflicts retain a local
        backup instead of silently overwriting a newer cloud save.
      </p>
      <p>
        Google sign-in uses Google OAuth and Supabase to authenticate your account; email and
        profile information are used for sign-in. Cloudflare hosts the QuestOS backend. Network
        requests reveal connection information such as IP address and browser or device headers to
        the receiving provider. Interface fonts are hosted by QuestOS; the app does not make Google
        Fonts requests. Hosting infrastructure can derive an approximate region from an IP address
        for network delivery and security. QuestOS does not request GPS access or use precise device
        location. Providers record authentication, request and service diagnostics; these are
        distinct from QuestOS's account-linked product analytics.
      </p>
      <h2>Notifications</h2>
      <p>
        Android reminders are scheduled locally after permission is granted. They use general text,
        not health or journal content. There is no remote push service. Billing and achievement
        alerts appear in the app according to your preferences.
      </p>
      <h2>Payments</h2>
      <p>
        Payments on the web are processed by Stripe. On Android they are processed by Google Play
        Billing (via RevenueCat). QuestOS never sees your full card number. RevenueCat receives your
        QuestOS account identifier and purchase/subscription records to verify access. Payment
        providers process payment information under their own policies.
      </p>

      <h2>AI</h2>
      <p>
        Prompts you send to the AI Coach are transmitted through the QuestOS backend to DeepSeek for
        model completion. QuestOS records feature usage and token counts, without storing prompts or
        generated text in its AI usage logs. Generated quests and saved assistant proposals can be
        stored with your account. Avoid entering sensitive information in prompts. DeepSeek
        processes the submitted content under its own applicable terms and privacy policy, which
        allow service and model improvement. We disclose this transfer as sharing with an AI
        provider and do not promise zero retention or exclusion from training. Contact us for help
        with provider deletion requests.
      </p>

      <h2>Optional memory, calendar and health features</h2>
      <p>
        AI Memory is off until you enable it. When enabled, your saved memory facts and the latest
        20 completion summaries are included in Coach requests to DeepSeek. Calendar and health
        records are not included in Coach requests.
      </p>
      <p>
        Device calendar access is optional. QuestOS reads the calendar you select and only updates
        events it created for your account. Saving a calendar preview uploads the displayed event
        titles and times to your QuestOS account.
      </p>
      <p>
        Health Connect access is read-only for steps, sleep and exercise. The app prepares the last
        30 days of daily totals on your device. Only after your confirmation are dates, steps, sleep
        minutes and workout minutes saved in Supabase. Raw health samples are not uploaded. You can
        clear the saved summary in Settings, including after a downgrade, and revoke device access
        in Health Connect.
      </p>
      <h2>Your rights</h2>
      <p>
        You can export your editable profile, quests, journal, achievements and saved Premium
        documents as JSON from
        <em> Settings → Data</em>. You can delete your account permanently from the same screen.
        Deletion is irreversible. See{" "}
        <a href="/legal/delete-account">account deletion instructions</a> for requests without the
        app. Deletion requests RevenueCat customer removal asynchronously. It does not cancel
        subscriptions: cancel Google Play or Stripe subscriptions separately before deleting.
      </p>

      <h2>Retention and deletion limits</h2>
      <p>
        Account data is kept while your account exists and removed from the active QuestOS database
        through account deletion. Trial-abuse hashes and billing deduplication identifiers remain
        for fraud prevention and duplicate-event protection. Google Play, Stripe and other providers
        may retain payment, backup and access records under their policies. QuestOS does not set a
        verified deletion period for these provider records. Deleting on one device cannot erase
        offline copies on other devices; clear their app or site data separately. Provider
        authentication audit and security logs may remain after account deletion, according to
        provider service, security and legal requirements. DeepSeek does not publish a fixed API
        prompt retention period in the terms reviewed. Contact us or privacy@deepseek.com about
        provider-held data. Its policy describes processing in China and rights to request deletion
        and opt out of model training.
      </p>
      <h2>Children and account safety</h2>
      <p>
        QuestOS is intended for teenagers aged 13 and above and adults, not children under 13. It is
        not a child-directed service. Minors should review these terms and provider notices with a
        parent or guardian and obtain permission where required. Parents or guardians can contact us
        about a child's information or deletion requests. Do not submit sensitive personal
        information about children to AI features.
      </p>
      <h2>Security and updates</h2>
      <p>
        Production connections use HTTPS. Account access rules restrict database records and the
        backend verifies paid access; private provider credentials stay on the server. No service
        can guarantee absolute security. Changes to this policy will be posted here with an updated
        date. Contact us to request access, correction or deletion assistance.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href={`mailto:${APP_CONFIG.legal.supportEmail}`}>{APP_CONFIG.legal.supportEmail}</a>.
      </p>
    </article>
  );
}
