import { ApiProperty } from '@nestjs/swagger';

export class SubmissionDocumentMetadataDto {
  @ApiProperty()
  originalName!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  uploadedAt!: Date;
}

export class JurySubmissionResponseDto {
  @ApiProperty()
  _id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  status!: string;

  @ApiProperty()
  phaseId!: string;

  @ApiProperty()
  groupId!: string;

  @ApiProperty()
  submittedAt!: Date;

  @ApiProperty({ type: [SubmissionDocumentMetadataDto] })
  documents!: SubmissionDocumentMetadataDto[];
}