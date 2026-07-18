import { create } from "zustand";

type UIState = {
  quickAddOpen: boolean;
  editorQuestId?: string; // undefined = closed, "new" = new quest
  openQuickAdd: () => void;
  closeQuickAdd: () => void;
  openEditor: (id: string) => void;
  closeEditor: () => void;
};

export const useUI = create<UIState>((set) => ({
  quickAddOpen: false,
  editorQuestId: undefined,
  openQuickAdd: () => set({ quickAddOpen: true }),
  closeQuickAdd: () => set({ quickAddOpen: false }),
  openEditor: (id) => set({ editorQuestId: id }),
  closeEditor: () => set({ editorQuestId: undefined }),
}));
