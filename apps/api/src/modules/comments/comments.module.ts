import { Module } from '@nestjs/common';
import { ModerationModule } from '../moderation/moderation.module.js';
import { CommentStatsService } from './comment-stats.service.js';
import { CommentsController } from './comments.controller.js';
import { CommentsService } from './comments.service.js';

@Module({
  imports: [ModerationModule],
  controllers: [CommentsController],
  providers: [CommentsService, CommentStatsService],
})
export class CommentsModule {}
