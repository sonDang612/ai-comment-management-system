import type { CommentAnalysisResult, CommentAnalyzer } from './comment-analyzer.js';

const STUB_REASON = 'AI 分析尚未启用,默认视为有效评论';

export class StubCommentAnalyzer implements CommentAnalyzer {
  readonly name = 'stub';

  analyze(): Promise<CommentAnalysisResult> {
    return Promise.resolve({
      analysis: { is_valid: true, is_question: false, category: null, confidence: 1, reason: STUB_REASON },
      scores: null,
    });
  }

  health(): Promise<Record<string, unknown>> {
    return Promise.resolve({ analyzer: this.name });
  }
}
