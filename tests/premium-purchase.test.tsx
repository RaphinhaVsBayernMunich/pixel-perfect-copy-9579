import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PurchaseView, type PurchaseViewProps } from "../src/components/subscription/purchase-view";

const base: PurchaseViewProps = {
  tier: "trial",
  days: 4,
  price: "₹249 / month",
  loaded: true,
  pricingLoading: false,
  pricingError: null,
  error: null,
  pending: false,
  native: true,
  cancelAtPeriodEnd: false,
  onPurchase() {},
  onRestore() {},
  onRetry() {},
  onManage() {},
};
const render = (props: Partial<PurchaseViewProps> = {}) =>
  renderToStaticMarkup(<PurchaseView {...base} {...props} />);
describe("Premium purchase presentation", () => {
  test("trial users get the supplied store price and immediate purchase option", () => {
    const html = render();
    expect(html).toContain("Premium Trial");
    expect(html).toContain("4 days remaining");
    expect(html).toContain("Upgrade to Premium");
    expect(html).toContain("₹249 / month");
    expect(html).toContain("Buying now starts your Google Play subscription");
    expect(html).not.toContain('disabled=""');
  });
  test("free users can buy, while paid users manage their existing subscription", () => {
    expect(render({ tier: "free" })).toContain("Upgrade to Premium");
    const paid = render({ tier: "premium" });
    expect(paid).toContain("Premium Active");
    expect(paid).toContain("Manage subscription");
    expect(paid).not.toContain("Upgrade to Premium");
  });
  test("missing or failed pricing never invents a price or enables purchase", () => {
    for (const props of [{ price: undefined }, { pricingError: "Unavailable" }]) {
      const html = render(props);
      expect(html).toContain("Retry pricing");
      expect(html).toContain("Restore purchases");
      expect(html).not.toContain("Upgrade to Premium");
      expect(html).not.toContain("₹249");
    }
  });
  test("loading is announced and purchasing disables repeat actions", () => {
    expect(render({ pricingLoading: true })).toContain("Loading verified pricing");
    expect(render({ loaded: false })).not.toContain("Upgrade to Premium");
    const pending = render({ pending: true });
    expect(pending).toContain("Completing purchase");
    expect(pending).toContain('disabled=""');
  });
  test("billing errors remain visible and cancelled renewal retains access copy", () => {
    expect(render({ error: "Purchase could not be completed. Retry." })).toContain('role="alert"');
    expect(render({ tier: "premium", cancelAtPeriodEnd: true })).toContain("current period ends");
  });
});
