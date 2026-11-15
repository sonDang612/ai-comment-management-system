import { Injectable } from '@nestjs/common';
import type { CommentDto, CommentListResponse, CreateCommentRequest } from '@acms/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { ModerationService } from '../moderation/moderation.service.js';
import { toCommentDto } from './comment.mapper.js';
import type { CommentListParams } from './comment-input.js';

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

  async list({ page, pageSize, search }: CommentListParams): Promise<CommentListResponse> {
    const where: Prisma.CommentWhereInput =
      search === undefined ? {} : { content: { contains: search, mode: 'insensitive' } };
    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: comments.map(toCommentDto), total, page, page_size: pageSize };
  }
}
