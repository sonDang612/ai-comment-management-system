import {
  appDateKey,
  type CommentDto,
  type CommentSortOrder,
  type DecisionSource, DEFAULT_COMMENT_PAGE_SIZE, DEFAULT_COMMENT_SORT_ORDER } from "@acms/shared";
import { create } from "zustand";

interface CommentsUiState {
  draft: string;
  isCreateOpen: boolean;
  page: number;
  pageSize: number;
  search: string;
  order: CommentSortOrder;
  decidedBy: DecisionSource | null;
  dateFrom: string | null;
  dateTo: string | null;
  detailComment: CommentDto | null;
  reviewComment: CommentDto | null;
  setDraft: (draft: string) => void;
  clearDraft: () => void;
  openCreate: () => void;
  closeCreate: () => void;
  setPagination: (page: number, pageSize: number) => void;
  setSearch: (search: string) => void;
  setOrder: (order: CommentSortOrder) => void;
  setDecidedBy: (decidedBy: DecisionSource | null) => void;
  setDateRange: (dateFrom: string | null, dateTo: string | null) => void;
  showFirstPage: () => void;
  openDetail: (comment: CommentDto) => void;
  closeDetail: () => void;
  openReview: (comment: CommentDto) => void;
  closeReview: () => void;
}

const today = appDateKey(new Date());

export const useCommentsUiStore = create<CommentsUiState>()((set) => ({
  draft: "",
  isCreateOpen: false,
  page: 1,
  pageSize: DEFAULT_COMMENT_PAGE_SIZE,
  search: "",
  order: DEFAULT_COMMENT_SORT_ORDER,
  decidedBy: null,
  dateFrom: today,
  dateTo: today,
  detailComment: null,
  reviewComment: null,
  setDraft: (draft) => set({ draft }),
  clearDraft: () => set({ draft: "" }),
  openCreate: () => set({ isCreateOpen: true }),
  closeCreate: () => set({ isCreateOpen: false }),
  setPagination: (page, pageSize) =>
    set((state) => ({ page: pageSize === state.pageSize ? page : 1, pageSize })),
  setSearch: (search) => set((state) => (state.search === search ? {} : { search, page: 1 })),
  setOrder: (order) => set((state) => (state.order === order ? {} : { order, page: 1 })),
  setDecidedBy: (decidedBy) => set((state) => (state.decidedBy === decidedBy ? {} : { decidedBy, page: 1 })),
  setDateRange: (dateFrom, dateTo) =>
    set((state) => (state.dateFrom === dateFrom && state.dateTo === dateTo ? {} : { dateFrom, dateTo, page: 1 })),
  showFirstPage: () => set({ page: 1 }),
  openDetail: (detailComment) => set({ detailComment }),
  closeDetail: () => set({ detailComment: null }),
  openReview: (reviewComment) => set({ reviewComment }),
  closeReview: () => set({ reviewComment: null }),
}));
