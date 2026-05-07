import { ApiProperty } from '@nestjs/swagger';

export class CommentResponseDto {
  @ApiProperty({
    description: 'Unique identifier for the comment',
    format: 'uuid',
  })
  commentId!: string;

  @ApiProperty({
    description: 'Text content of the comment',
  })
  commentText!: string;

  @ApiProperty({
    description: 'User ID of the reviewer who created this comment',
    format: 'uuid',
  })
  reviewerUserId!: string;

  @ApiProperty({
    description: 'Timestamp when the comment was created',
    format: 'date-time',
  })
  createdAt!: Date;
}
