import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true })
export class Team {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  leaderId!: string;

  @Prop()
  jiraProjectKey!: string;

  @Prop()
  githubRepositoryId!: string;

  @Prop()
  jiraDomain!: string;

  @Prop()
  jiraEmail!: string;

  @Prop()
  jiraApiToken!: string;
}

export const TeamSchema = SchemaFactory.createForClass(Team);