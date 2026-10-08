import identity from "@/lib/config/legal-operator.json";

/** The public legal identity is supplied by the owner, never inferred from the brand. */
export function LegalOperatorNotice() {
  if (!identity.legalOperatorName) return null;
  return <p>QuestOS is operated by {identity.legalOperatorName}.</p>;
}
