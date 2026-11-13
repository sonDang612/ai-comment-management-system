import { type CommentDto, DEFAULT_COMMENT_PAGE_SIZE } from "@acms/shared";
import { create } from "zustand";

export type CommentValidityFilter = "all" | "valid" | "invalid";

interface CommentsUiState {
  draft: string;
  isCreateOpen: boolean;
  page: number;
  pageSize: number;
  validityFilter: CommentValidityFilter;
  search: string;
  detailComment: CommentDto | null;
  setDraft: (draft: string) => void;
  clearDraft: () => void;
  openCreate: () => void;
  closeCreate: () => void;
  setPagination: (page: number, pageSize: number) => void;
  setValidityFilter: (filter: CommentValidityFilter) => void;
  setSearch: (search: string) => void;
  showFirstPage: () => void;
  openDetail: (comment: CommentDto) => void;
  closeDetail: () => void;
}

export const useCommentsUiStore = create<CommentsUiState>()((set) => ({
  draft: "",
  isCreateOpen: false,
  page: 1,
  pageSize: DEFAULT_COMMENT_PAGE_SIZE,
  validityFilter: "all",
  search: "",
  detailComment: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: "" }),
  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
  setPagination: (page, pageSize) =>
    set((state) => ({ page: pageSize === state.pageSize ? page : 1, pageSize })),
  setValidityFilter: (validityFilter) => set({ validityFilter, page: 1 }),
  setSearch: (search) => set((state) => (state.search === search ? {} : { search, page: 1 })),
  showFirstPage: () => set({ page: 1 }),
  openDetail: (detailComment) => set({ detailComment }),
  closeDetail: () => set({ detailComment: null }),
}));
