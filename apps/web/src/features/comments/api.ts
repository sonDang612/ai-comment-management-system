import {
  API_V1_PREFIX,
  type CommentDto,
  type CommentListResponse,
  type CommentSortOrder,
  type DecisionSource,
  type CreateCommentRequest,
  type ReviewCommentRequest,
} from "@acms/shared";
import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const COMMENTS_PATH = `${API_V1_PREFIX}/comments`;

export interface CommentListParams {
  page: number;
  pageSize: number;
  search?: string;
  order: CommentSortOrder;
  decidedBy?: DecisionSource;
}

export const commentKeys = {
  all: ["comments"] as const,
  lists: () => [...commentKeys.all, "list"] as const,
  list: (params: CommentListParams) => [...commentKeys.lists(), params] as const,
};

export function commentListQueryOptions(params: CommentListParams) {
  return queryOptions({
    queryKey: commentKeys.list(params),
    queryFn: () =>
      apiClient.get<CommentListResponse>(COMMENTS_PATH, {
        query: {
          page: params.page,
          page_size: params.pageSize,
          q: params.search,
          order: params.order,
          decided_by: params.decidedBy,
        },
      }),
    placeholderData: keepPreviousData,
  });
}

export function useComments(params: CommentListParams) {
  return useQuery(commentListQueryOptions(params));
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateCommentRequest) =>
      apiClient.post<CommentDto>(COMMENTS_PATH, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.lists() }),
  });
}

export function useReviewComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...request }: ReviewCommentRequest & { id: string }) =>
      apiClient.put<CommentDto>(`${COMMENTS_PATH}/${encodeURIComponent(id)}/review`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.all }),
  });
}
