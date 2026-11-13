import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import type { CommentDto, CommentListResponse } from '@acms/shared';
import { parseCommentListQuery, type RawCommentListQuery } from './comment-input.js';
import { CommentsService } from './comments.service.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';

@Controller('comments')
export class CommentsController {
  constructor(private readonly comments: CommentsService) {}

  @Get()
  list(@Query() query: RawCommentListQuery): Promise<CommentListResponse> {
    return this.comments.list(parseCommentListQuery(query));
  }

  @Post()
  create(@Body() body: CreateCommentDto): Promise<CommentDto> {
    return this.comments.create(body);
  }
}
