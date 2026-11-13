import {
  API_V1_PREFIX,
  type CommentDto,
  type CommentListResponse,
  type CommentStatus,
  type CreateCommentRequest,
} from "@acms/shared";
import { keepPreviousData, queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const COMMENTS_PATH = `${API_V1_PREFIX}/comments`;

export interface CommentListParams {
  page: number;
  pageSize: number;
  status?: CommentStatus;
  search?: string;
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
          status: params.status,
          q: params.search,
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
