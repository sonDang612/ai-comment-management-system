import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../config/env.js';
import { TeiClient } from '../../../infrastructure/tei/tei.client.js';
import { ClassifierCommentAnalyzer } from './classifier-comment-analyzer.js';
import { COMMENT_ANALYZER, type CommentAnalyzer } from './comment-analyzer.js';
import { StubCommentAnalyzer } from './stub-comment-analyzer.js';

function createCommentAnalyzer(config: ConfigService<Env, true>, tei: TeiClient): CommentAnalyzer {
  if (config.get('AI_ANALYZER', { infer: true }) === 'stub') {
    new Logger('CommentAnalysis').warn('AI_ANALYZER=stub: every comment that passes the rules is marked valid');
    return new StubCommentAnalyzer();
  }
  return new ClassifierCommentAnalyzer(tei);
}

@Module({
  providers: [{ provide: COMMENT_ANALYZER, inject: [ConfigService, TeiClient], useFactory: createCommentAnalyzer }],
  exports: [COMMENT_ANALYZER],
})
export class CommentAnalysisModule {}
