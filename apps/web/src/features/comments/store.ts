import type { CommentStatus } from "@acms/shared";
import { create } from "zustand";

export type CommentStatusFilter = CommentStatus | "all";

interface CommentsUiState {
  draft: string;
  statusFilter: CommentStatusFilter;
  setDraft: (draft: string) => void;
  clearDraft: () => void;
  setStatusFilter: (filter: CommentStatusFilter) => void;
}

export const useCommentsUiStore = create<CommentsUiState>()((set) => ({
  draft: "",
  statusFilter: "all",
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: "" }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));
