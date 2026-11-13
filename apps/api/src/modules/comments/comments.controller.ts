import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CommentDto, CommentListResponse } from '@acms/shared';
import { parseCommentListQuery, parseCreateCommentRequest, type RawCommentListQuery } from './comment-input.js';
import { CommentsService } from './comments.service.js';

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Query() query: RawCommentListQuery): Promise<CommentListResponse> {
    return this.comments.list(parseCommentListQuery(query));
  }

  @Post()
  create(@Body() body: unknown): Promise<CommentDto> {
    return this.comments.create(parseCreateCommentRequest(body));
  }
}
