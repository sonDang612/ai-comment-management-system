import {
  API_V1_PREFIX,
  type CommentDto,
  type CommentListResponse,
  type CreateCommentRequest,
} from "@acms/shared";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

const COMMENTS_PATH = `${API_V1_PREFIX}/comments`;

export const commentKeys = {
  all: ["comments"] as const,
  list: () => [...commentKeys.all, "list"] as const,
};

export const commentListQueryOptions = queryOptions({
  queryKey: commentKeys.list(),
  queryFn: () => apiClient.get<CommentListResponse>(COMMENTS_PATH),
  select: (response) => response.items,
});

export function useComments() {
  return useQuery(commentListQueryOptions);
}

export function useCreateComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateCommentRequest) =>
      apiClient.post<CommentDto>(COMMENTS_PATH, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: commentKeys.all }),
  });
}
