import {
  COMMENT_CATEGORIES,
  MODERATION_LABELS,
  type CommentCategory,
  type ModerationLabel,
  type ReviewCommentRequest,
} from '@acms/shared';
import { IsIn } from 'class-validator';

export class ReviewCommentDto implements ReviewCommentRequest {
  @IsIn(MODERATION_LABELS)
  label: ModerationLabel;

  @IsIn(COMMENT_CATEGORIES)
  category: CommentCategory;
}
