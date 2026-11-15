import { Injectable } from '@nestjs/common';
import {
  categoryMatchesLabel,
  type CommentDto,
  type CommentListResponse,
  type CreateCommentRequest,
  type ReviewCommentRequest,
} from '@acms/shared';
import { isUUID } from 'class-validator';
import { NotFoundException, ValidationException } from '../../common/errors/app.exception.js';
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

  async review(id: string, { label, category }: ReviewCommentRequest): Promise<CommentDto> {
    if (!categoryMatchesLabel(category, label)) {
      throw new ValidationException(`category ${category} does not match label ${label}`, [
        { field: 'category', rule: 'matches_label', label },
      ]);
    }
    const existing = isUUID(id) ? await this.prisma.comment.findUnique({ where: { id }, select: { id: true } }) : null;
    if (!existing) throw new NotFoundException(`Comment ${id} not found`);
    const reviewed = await this.prisma.comment.update({
      where: { id },
      data: { reviewedLabel: label, reviewedCategory: category, reviewedAt: new Date(), decidedBy: 'admin' },
    });
    return toCommentDto(reviewed);
  }

  async list({ page, pageSize, search, order }: CommentListParams): Promise<CommentListResponse> {
    const where: Prisma.CommentWhereInput =
      search === undefined ? {} : { content: { contains: search, mode: 'insensitive' } };
    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: [{ createdAt: order }, { id: order }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return { items: comments.map(toCommentDto), total, page, page_size: pageSize };
  }
}
