import type { CommentDto } from '@acms/shared';
import type { Comment } from '../../generated/prisma/client.js';

export function toCommentDto(comment: Comment): CommentDto {
  return {
    id: comment.id,
    content: comment.content,
    status: comment.status,
    reason: comment.reason,
    confidence: comment.confidence === null ? null : comment.confidence.toNumber(),
    decided_by: comment.decidedBy,
    moderated_at: comment.moderatedAt?.toISOString() ?? null,
    created_at: comment.createdAt.toISOString(),
    updated_at: comment.updatedAt.toISOString(),
  };
}
