import { createFileRoute } from "@tanstack/react-router";
import { APP_CONFIG } from "@/lib/config/admin-config";
import { LegalOperatorNotice } from "@/components/legal-operator-notice";

export const Route = createFileRoute("/legal/delete-account")({
  head: () => ({ meta: [{ title: "Delete your QuestOS account" }] }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const email = APP_CONFIG.legal.supportEmail;
  return (
    <article className="prose prose-invert mx-auto max-w-2xl px-5 py-10">
      <h1>Delete your QuestOS account and data</h1>
      <LegalOperatorNotice />
      <p>You can request deletion without installing the app.</p>
      <p>
        <a href={`mailto:${email}?subject=QuestOS%20account%20deletion`}>Email {email}</a> from the
        address associated with your QuestOS account with the subject “QuestOS account deletion”. We
        need to verify account ownership before removing data. Never send a password, payment card
        number or API key.
      </p>
      <p>
        For immediate self-service deletion, sign in to QuestOS, open Settings → Delete account,
        type DELETE and confirm. This removes the authentication account, profile, quests, journal,
        achievements, saved calendar and health summaries, AI memory and account-linked analytics.
        It requests RevenueCat customer deletion; RevenueCat completes it asynchronously. Local
        account saves on the device performing deletion are also removed.
      </p>
      <h2>Subscriptions and retained records</h2>
      <p>
        Account deletion does not cancel subscriptions. Cancel through Google Play subscriptions or
        your Stripe billing portal before deleting to avoid future charges. Google Play and Stripe
        may retain transaction records. Trial-abuse hashes and billing event identifiers remain for
        fraud prevention and duplicate-event protection. Provider backup, access-log and retention
        schedules are governed by those providers. Contact us for requests about provider-held
        personal information or deletion from other devices.
      </p>
      <p>
        <a href="/legal/privacy">Read the QuestOS privacy policy</a>
      </p>
    </article>
  );
}
