import { Module } from '@nestjs/common';
import { RuleSettingsModule } from '../rule-settings/rule-settings.module.js';
import { CommentAnalysisModule } from './analysis/comment-analysis.module.js';
import { ModerationService } from './moderation.service.js';
import { RuleChecker } from './rules/rule-checker.js';

@Module({
  imports: [RuleSettingsModule, CommentAnalysisModule],
  providers: [ModerationService, RuleChecker],
  exports: [ModerationService],
})
export class ModerationModule {}
