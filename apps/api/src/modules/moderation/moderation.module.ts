import { Module } from '@nestjs/common';
import { RuleSettingsModule } from '../rule-settings/rule-settings.module.js';
import { ModerationPolicy } from './moderation-policy.js';
import { ModerationService } from './moderation.service.js';
import { RuleChecker } from './rules/rule-checker.js';

@Module({
  imports: [RuleSettingsModule],
  providers: [ModerationPolicy, ModerationService, RuleChecker],
  exports: [ModerationService],
})
export class ModerationModule {}
