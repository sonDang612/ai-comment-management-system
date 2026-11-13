import { type CommentStatus, DEFAULT_COMMENT_PAGE_SIZE } from "@acms/shared";
import { create } from "zustand";

export type CommentStatusFilter = CommentStatus | "all";

interface CommentsUiState {
  draft: string;
  isCreateOpen: boolean;
  page: number;
  pageSize: number;
  statusFilter: CommentStatusFilter;
  search: string;
  setDraft: (draft: string) => void;
  clearDraft: () => void;
  openCreate: () => void;
  closeCreate: () => void;
  setPagination: (page: number, pageSize: number) => void;
  setStatusFilter: (filter: CommentStatusFilter) => void;
  setSearch: (search: string) => void;
  showFirstPage: () => void;
}

export const useCommentsUiStore = create<CommentsUiState>()((set) => ({
  draft: "",
  isCreateOpen: false,
  page: 1,
  pageSize: DEFAULT_COMMENT_PAGE_SIZE,
  statusFilter: "all",
  search: "",
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: "" }),
  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
  setPagination: (page, pageSize) =>
    set((state) => ({ page: pageSize === state.pageSize ? page : 1, pageSize })),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setSearch: (search) => set((state) => (state.search === search ? {} : { search, page: 1 })),
  showFirstPage: () => set({ page: 1 }),
}));
