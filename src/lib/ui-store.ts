import { create } from "zustand";

type UIState = {
  quickAddOpen: boolean;
  editorQuestId?: string;
  aiCoachOpen: boolean;
  paywallOpen: boolean;
  /** Stripe Embedded Checkout client_secret — when set, the paywall shows the checkout form. */
  checkoutClientSecret: string | null;
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
  openAICoach: () => void;
  closeAICoach: () => void;
  openPaywall: () => void;
  closePaywall: () => void;
  setCheckoutClientSecret: (secret: string | null) => void;
};

export const useUI = create<UIState>((set) => ({
  quickAddOpen: false,
  editorQuestId: undefined,
  aiCoachOpen: false,
  paywallOpen: false,
  checkoutClientSecret: null,
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  openEditor: (id) => set({ editorQuestId: id }),
  closeEditor: () => set({ editorQuestId: undefined }),
  openAICoach: () => set({ aiCoachOpen: true }),
  closeAICoach: () => set({ aiCoachOpen: false }),
  openPaywall: () => set({ paywallOpen: true }),
  closePaywall: () => set({ paywallOpen: false, checkoutClientSecret: null }),
  setCheckoutClientSecret: (secret) => set({ checkoutClientSecret: secret }),
}));
