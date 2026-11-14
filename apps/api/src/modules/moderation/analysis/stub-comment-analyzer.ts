import type { AiCommentAnalysis } from '@acms/shared';
import type { CommentAnalyzer } from './comment-analyzer.js';

const STUB_REASON = 'AI 分析尚未启用,默认视为有效评论';

export class StubCommentAnalyzer implements CommentAnalyzer {
  readonly name = 'stub';

  analyze(): Promise<AiCommentAnalysis> {
    return Promise.resolve({ is_valid: true, is_question: false, confidence: 1, reason: STUB_REASON });
  }

  health(): Promise<Record<string, unknown>> {
    return Promise.resolve({ analyzer: this.name });
  }
}
