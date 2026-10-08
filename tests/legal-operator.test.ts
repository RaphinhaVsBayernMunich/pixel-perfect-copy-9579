import { describe, expect, test } from "bun:test";
import { legalOperatorUpdates, validateLegalOperator } from "../scripts/legal-operator.mjs";

describe("owner-supplied legal identity preparation", () => {
  test("rejects missing, multiline and invisible-control identities", () => {
    for (const name of [
      undefined,
      "",
      "   ",
      "Example\nName",
      "Example\u202eName",
      "x".repeat(201),
    ])
      expect(() => validateLegalOperator(name)).toThrow();
  });

  test("safely preserves quoted names and keeps product branding separate", () => {
    const name = 'Example "A&B" Operator';
    const updates = legalOperatorUpdates(name, process.cwd());
    expect(JSON.parse(updates["src/lib/config/legal-operator.json"]).legalOperatorName).toBe(name);
    expect(JSON.parse(updates["docs/store/play-console-values.json"]).legalOperatorName).toBe(name);
    const listing = JSON.parse(updates["docs/store/play-listing.en-US.json"]);
    expect(listing.title).toBe("QuestOS");
    expect(listing.fullDescription.endsWith(`Operator: ${name}`)).toBe(true);
    expect(listing.fullDescription.length).toBeLessThanOrEqual(4000);
    expect(updates["docs/store/legal-operator.md"]).toContain(name);
    expect(updates["docs/store/play-listing-copy-ready.md"]).toContain(`Operator: ${name}`);
  });
});
