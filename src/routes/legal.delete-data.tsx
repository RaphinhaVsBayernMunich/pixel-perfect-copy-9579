import { createFileRoute } from "@tanstack/react-router";
import { APP_CONFIG } from "@/lib/config/admin-config";
import { LegalOperatorNotice } from "@/components/legal-operator-notice";

export const Route = createFileRoute("/legal/delete-data")({
  head: () => ({ meta: [{ title: "Delete selected QuestOS data" }] }),
  component: DeleteDataPage,
});

function DeleteDataPage() {
  const email = APP_CONFIG.legal.supportEmail;
  const request = `mailto:${email}?subject=${encodeURIComponent("QuestOS selected data deletion")}&body=${encodeURIComponent("Please delete the following selected QuestOS data while keeping my account:\n\nCategory and records/date range: \n\nI am writing from my QuestOS account email. Please confirm ownership and scope before deletion. Do not delete my account.")}`;
  return (
    <article className="prose prose-invert mx-auto max-w-2xl px-5 py-10">
      <h1>Delete selected QuestOS data without deleting your account</h1>
      <LegalOperatorNotice />
      <p>
        The options below keep your account, login and subscription. They do not require account
        deletion or cancel billing. Deletion cannot be undone through these controls.
      </p>
      <h2>Request help without installing or signing in to the app</h2>
      <p>
        <a href={request}>Email {email} to request selected data deletion</a> from the email address
        associated with your QuestOS account. Use the subject “QuestOS selected data deletion”.
        Specify saved health summaries, journal entries, quests or AI Memory facts, and identify the
        records or date range to remove. State that you want to keep your account. Do not include
        health details or journal text when a title/date is sufficient. Never send passwords,
        payment details or API keys. We verify account ownership and scope before acting and respond
        to confirm the result or explain any limitation. If you cannot use your account email,
        contact the same address for ownership verification help.
      </p>
      <p>
        This is a support request, not an instant automated deletion. You do not need a paid plan to
        request help, including if Premium access has expired. Opening the email link does not send
        a message; send it using your email app, or compose it to the address above.
      </p>
      <h2>Saved health summaries</h2>
      <p>
        Sign in → Settings → Clear saved health summary → confirm. Wait for “Saved health summary
        removed.” This deletes the saved QuestOS health summary from the active account database,
        including after a Premium downgrade. If an error appears, retry. It does not delete original
        Health Connect records. Manage those records and permissions in Health Connect separately;
        importing and confirming another summary saves it again.
      </p>
      <h2>Journal entries</h2>
      <p>
        Sign in → Legacy → Memory Vault → find the entry → select its X button labelled “Delete
        memory”. On a desktop, hover over the entry to reveal the button. This removes that journal
        entry, not every Legacy milestone, achievement or completion record.
      </p>
      <h2>Quests</h2>
      <p>
        Sign in → Quests → open the quest’s three-dot menu → Delete. This removes the selected
        quest; existing completion history, XP and achievements are not erased. Deleting a quest
        does not promise deletion of copies in your device calendar; manage those in your calendar
        app.
      </p>
      <p>
        Journal and quest removals sync to your account while online. If a sync error appears, use
        Retry sync and wait for it to clear. Offline changes are pending until synchronization
        succeeds. Contact support if an error or conflict remains; do not assume the cloud record
        has been removed merely because it disappears locally.
      </p>
      <h2>AI Memory facts</h2>
      <p>
        With active Premium or trial access, sign in → Premium workspace → AI Memory → Clear memory.
        Wait for “Saved”. This replaces saved facts with an empty list and disables memory use in
        future Coach requests. An empty settings record remains. Simply turning off “Use memory in
        AI Coach” is not deletion. If the workspace is unavailable, use the support request above
        without purchasing or deleting your account.
      </p>
      <h2>What remains</h2>
      <p>
        Your login, profile, settings, other records and billing status remain. There is no general
        self-service erase control here for profile/onboarding details, saved calendar previews,
        assistant proposals or all account history. Previously sent AI inputs are not recalled from
        DeepSeek by clearing Memory; contact support for provider-held information requests.
      </p>
      <p>
        Account-scoped local saves, conflict recovery copies, exported files and offline copies on
        other devices may still contain old data. Sync other devices; ask support before resolving a
        conflict with an old copy. Remove exported files or clear app/site storage on those devices
        if needed, after syncing changes you want to keep. Provider backups/access logs follow their
        retention policies; no immediate backup erasure or fixed retention period is promised.
        Payment records, trial-abuse hashes and billing event identifiers may remain for transaction
        obligations, fraud prevention and duplicate-event protection.
      </p>
      <p>
        <a href="/legal/privacy">Privacy policy and retention details</a>. To remove your account
        and associated data instead, use the separate{" "}
        <a href="/legal/delete-account">account deletion page</a>.
      </p>
    </article>
  );
}
