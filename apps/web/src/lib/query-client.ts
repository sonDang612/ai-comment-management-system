import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query";
import { ApiError } from "@/lib/api";
import { logger } from "@/lib/logger";

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && !error.isRetryable) return false;
  return failureCount < 2;
}

/** Central TanStack Query configuration: retries, caching and error logging. */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error, query) =>
        logger.error("Query failed", { queryKey: query.queryKey, message: error.message }),
    }),
    mutationCache: new MutationCache({
      onError: (error) => logger.error("Mutation failed", { message: error.message }),
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: { retry: false },
    },
  });
}
