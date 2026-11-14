import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.js';
import { VllmClient } from '../../../infrastructure/vllm/vllm.client.js';
import { COMMENT_ANALYZER, type CommentAnalyzer } from './comment-analyzer.js';
import { StubCommentAnalyzer } from './stub-comment-analyzer.js';
import { VllmCommentAnalyzer } from './vllm-comment-analyzer.js';

function createCommentAnalyzer(config: ConfigService<Env, true>, vllm: VllmClient): CommentAnalyzer {
  if (config.get('AI_ANALYZER', { infer: true }) === 'stub') {
    new Logger('CommentAnalysis').warn('AI_ANALYZER=stub: every comment that passes the rules is marked valid');
    return new StubCommentAnalyzer();
  }
  return new VllmCommentAnalyzer(vllm);
}

@Module({
  providers: [{ provide: COMMENT_ANALYZER, inject: [ConfigService, VllmClient], useFactory: createCommentAnalyzer }],
  exports: [COMMENT_ANALYZER],
})
export class CommentAnalysisModule {}
