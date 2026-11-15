import type { AiCommentAnalysis, AiCommentAnalysisRequest, ModelOutputScore } from '@acms/shared';

export const COMMENT_ANALYZER = Symbol('COMMENT_ANALYZER');

export interface CommentAnalysisResult {
  analysis: AiCommentAnalysis;
  scores: ModelOutputScore[] | null;
}

export interface CommentAnalyzer {
  readonly name: 'classifier' | 'stub';
  analyze(request: AiCommentAnalysisRequest): Promise<CommentAnalysisResult>;
  health(timeoutMs: number): Promise<Record<string, unknown>>;
}
