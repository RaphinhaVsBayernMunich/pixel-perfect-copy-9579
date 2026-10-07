import { createFileRoute } from "@tanstack/react-router";
import { APP_CONFIG } from "@/lib/config/admin-config";

export const Route = createFileRoute("/legal/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — QuestOS" },
      { name: "description", content: "The terms that govern your use of QuestOS." },
      { property: "og:title", content: "Terms of Service — QuestOS" },
      { property: "og:description", content: "The terms that govern your use of QuestOS." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-2xl px-5 pt-10 pb-16 md:px-10 md:pt-16">
      <h1 className="font-display text-3xl font-semibold">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: 7 October 2026</p>

      <h2>The service</h2>
      <p>
        {APP_CONFIG.legal.companyName} provides a gamified life-planning app. You may use it for
        personal, non-commercial purposes.
      </p>

      <h2>Age and eligibility</h2>
      <p>
        QuestOS is intended for users aged 13 and above and is not designed for children under 13.
        Minors must review these terms and AI provider notices with a parent or guardian and obtain
        permission where required by applicable law or provider terms. Do not provide sensitive
        information about children to AI features.
      </p>

      <h2>Subscriptions</h2>
      <p>
        QuestOS offers a 7-day free trial to new accounts, followed by an optional Premium
        subscription. Subscriptions renew automatically until cancelled from the billing portal
        (Web) or Google Play (Android). Refunds follow the policy of the billing provider. The app
        trial does not charge you automatically; purchasing the monthly plan is a separate action.
        Deleting a QuestOS account does not cancel a store subscription.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don't attempt to circumvent premium gates, reverse-engineer the app, or abuse the AI
        endpoints beyond the published quotas.
      </p>

      <h2>AI and health summaries</h2>
      <p>
        AI suggestions and projections may be inaccurate. Health features summarize steps, sleep and
        exercise totals; they do not diagnose conditions or replace professional care.
      </p>
      <h2>Warranty</h2>
      <p>
        QuestOS is provided "as is" without warranty. We aim for zero data loss but strongly
        recommend using the built-in Data Export tool periodically.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email{" "}
        <a href={`mailto:${APP_CONFIG.legal.supportEmail}`}>{APP_CONFIG.legal.supportEmail}</a>.
      </p>
    </article>
  );
}
