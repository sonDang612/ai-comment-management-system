import { COMMENT_CONTENT_MAX_LENGTH, type CreateCommentRequest } from '@acms/shared';
import { Transform } from 'class-transformer';
import { IsString, MaxLength } from 'class-validator';

export class CreateCommentDto implements CreateCommentRequest {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(COMMENT_CONTENT_MAX_LENGTH)
  content: string;
}
