import { Injectable } from '@nestjs/common';
import type { CommentDto, CommentListResponse, CreateCommentRequest } from '@acms/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { toCommentDto } from './comment.mapper.js';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly moderation: ModerationService,
  ) {}

  async create(request: CreateCommentRequest): Promise<CommentDto> {
    const comment = await this.prisma.comment.create({ data: { content: request.content } });
    const moderated = await this.moderation.moderate(comment);
    return toCommentDto(moderated);
  }

  async list(limit: number): Promise<CommentListResponse> {
    const comments = await this.prisma.comment.findMany({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return { items: comments.map(toCommentDto) };
  }
}
