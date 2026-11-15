import { type CommentDto, DEFAULT_COMMENT_PAGE_SIZE } from "@acms/shared";
import { create } from "zustand";

interface CommentsUiState {
  draft: string;
  isCreateOpen: boolean;
  page: number;
  pageSize: number;
  search: string;
  detailComment: CommentDto | null;
  reviewComment: CommentDto | null;
  setDraft: (draft: string) => void;
  clearDraft: () => void;
  openCreate: () => void;
  closeCreate: () => void;
  setPagination: (page: number, pageSize: number) => void;
  setSearch: (search: string) => void;
  showFirstPage: () => void;
  openDetail: (comment: CommentDto) => void;
  closeDetail: () => void;
  openReview: (comment: CommentDto) => void;
  closeReview: () => void;
}

export const useCommentsUiStore = create<CommentsUiState>()((set) => ({
  draft: "",
  isCreateOpen: false,
  page: 1,
  pageSize: DEFAULT_COMMENT_PAGE_SIZE,
  search: "",
  detailComment: null,
  reviewComment: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: "" }),
  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
  setPagination: (page, pageSize) =>
    set((state) => ({ page: pageSize === state.pageSize ? page : 1, pageSize })),
  setSearch: (search) => set((state) => (state.search === search ? {} : { search, page: 1 })),
  showFirstPage: () => set({ page: 1 }),
  openDetail: (detailComment) => set({ detailComment }),
  closeDetail: () => set({ detailComment: null }),
  openReview: (reviewComment) => set({ reviewComment }),
  closeReview: () => set({ reviewComment: null }),
}));
