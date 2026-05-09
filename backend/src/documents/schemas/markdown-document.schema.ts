import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type MarkdownDocumentDocument = HydratedDocument<MarkdownDocument>;

@Schema({ _id: false })
export class MarkdownSection {
  @Prop({ required: true }) sectionId!: string;
  @Prop({ required: true }) heading!: string;
  @Prop({ required: true, min: 1, max: 6 }) level!: number;
  @Prop({ required: true }) order!: number;
  @Prop({ required: true }) slug!: string;
}
export const MarkdownSectionSchema =
  SchemaFactory.createForClass(MarkdownSection);

@Schema({ timestamps: true })
export class MarkdownDocument {
  @Prop({
    required: true,
    unique: true,
    index: true,
    default: () => randomUUID(),
  })
  documentId!: string;

  @Prop({ required: true, unique: true, index: true })
  submissionId!: string;

  @Prop({ required: true, index: true })
  groupId!: string;

  @Prop({ required: true, maxlength: 200 })
  title!: string;

  @Prop({ required: true, maxlength: 1_000_000 })
  contentMarkdown!: string;

  @Prop({ type: [MarkdownSectionSchema], default: [] })
  sections!: MarkdownSection[];

  @Prop() createdBy?: string;
  @Prop() updatedBy?: string;
}

export const MarkdownDocumentSchema =
  SchemaFactory.createForClass(MarkdownDocument);
