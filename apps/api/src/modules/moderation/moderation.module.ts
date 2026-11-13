import { Module } from '@nestjs/common';
import { ModerationPolicy } from './moderation-policy.js';
import { ModerationService } from './moderation.service.js';

@Module({
  providers: [ModerationPolicy, ModerationService],
  exports: [ModerationService],
})
export class ModerationModule {}
