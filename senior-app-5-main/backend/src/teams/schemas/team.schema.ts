import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TeamDocument = HydratedDocument<Team>;

@Schema({ timestamps: true })
export class Team {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  leaderId!: string;

  @Prop({ type: [String], default: [] })
  members!: string[];

  @Prop({ type: Number, default: 0 })
  memberCount!: number;

  @Prop()
  jiraProjectKey?: string;

  @Prop()
  githubRepositoryId?: string;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
