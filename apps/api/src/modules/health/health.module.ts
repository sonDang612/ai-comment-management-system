import { Module } from '@nestjs/common';
import { CommentAnalysisModule } from '../moderation/analysis/comment-analysis.module.js';
import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

@Module({
  imports: [CommentAnalysisModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
