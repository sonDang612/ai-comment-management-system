import type { AiCommentAnalysis, AiCommentAnalysisRequest } from '@acms/shared';

export const COMMENT_ANALYZER = Symbol('COMMENT_ANALYZER');

export interface CommentAnalyzer {
  readonly name: 'vllm' | 'stub';
  analyze(request: AiCommentAnalysisRequest): Promise<AiCommentAnalysis>;
  health(timeoutMs: number): Promise<Record<string, unknown>>;
}
