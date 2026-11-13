import { create } from "zustand";

export type KeywordEditor = { mode: "create" } | { mode: "edit"; keywordId: string };

interface SettingsUiState {
  keywordEditor: KeywordEditor | null;
  openKeywordCreate: () => void;
  openKeywordEdit: (keywordId: string) => void;
  closeKeywordEditor: () => void;
}

export const useSettingsUiStore = create<SettingsUiState>()((set) => ({
  keywordEditor: null,
  openKeywordCreate: () => set({ keywordEditor: { mode: "create" } }),
  openKeywordEdit: (keywordId) => set({ keywordEditor: { mode: "edit", keywordId } }),
  closeKeywordEditor: () => set({ keywordEditor: null }),
}));
