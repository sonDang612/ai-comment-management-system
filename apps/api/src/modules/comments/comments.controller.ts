import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import type { CommentDto, CommentListResponse, CommentStatsResponse } from '@acms/shared';
import {
  parseCommentListQuery,
  parseCommentStatsDays,
  type RawCommentListQuery,
  type RawCommentStatsQuery,
} from './comment-input.js';
import { CommentStatsService } from './comment-stats.service.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { ReviewCommentDto } from './dto/review-comment.dto.js';

@Controller('comments')
export class CommentsController {
  constructor(
    private readonly comments: CommentsService,
    private readonly commentStats: CommentStatsService,
  ) {}

  @Get('stats')
  stats(@Query() query: RawCommentStatsQuery): Promise<CommentStatsResponse> {
    return this.commentStats.stats(parseCommentStatsDays(query));
  }

  @Get()
  list(@Query() query: RawCommentListQuery): Promise<CommentListResponse> {
    return this.comments.list(parseCommentListQuery(query));
  }

  @Post()
  create(@Body() body: CreateCommentDto): Promise<CommentDto> {
    return this.comments.create(body);
  }

  @Put(':id/review')
  review(@Param('id') id: string, @Body() body: ReviewCommentDto): Promise<CommentDto> {
    return this.comments.review(id, body);
  }
}
