import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TeamDocument = Team & Document;

@Schema({ timestamps: true })
export class Team {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  leaderId!: string;

  /** Cohort/group identifier this team belongs to — links to SprintConfig.groupId. */
  @Prop({ type: String, default: null, index: true })
  groupId!: string | null;

  @Prop()
  jiraProjectKey!: string;

  /** Numeric JIRA board id used by /rest/agile/1.0/board/{boardId}/sprint. */
  @Prop({ type: String, default: null })
  jiraBoardId!: string | null;

  /**
   * Custom field id Jira uses to expose Story Points for this team's instance.
   * Defaults to `customfield_10016` (Jira Cloud default), but each Jira instance
   * may have a different id, so the team leader can override it.
   */
  @Prop({ type: String, default: 'customfield_10016' })
  jiraStoryPointsField!: string;

  @Prop()
  githubRepositoryId!: string;

  @Prop()
  jiraDomain!: string;

  @Prop()
  jiraEmail!: string;

  /** AES-256-GCM ciphertext of the JIRA API token, formatted iv:tag:ciphertext (base64). */
  @Prop()
  jiraApiToken!: string;

  @Prop()
  githubToken!: string;
}

export const TeamSchema = SchemaFactory.createForClass(Team);
