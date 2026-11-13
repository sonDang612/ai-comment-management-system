import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CommentDto, CommentListResponse } from '@acms/shared';
import { parseCreateCommentRequest, parseListLimit } from './comment-input.js';
import { CommentsService } from './comments.service.js';

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Query('limit') limit?: string): Promise<CommentListResponse> {
    return this.comments.list(parseListLimit(limit));
  }

  @Post()
  create(@Body() body: unknown): Promise<CommentDto> {
    return this.comments.create(parseCreateCommentRequest(body));
  }
}
