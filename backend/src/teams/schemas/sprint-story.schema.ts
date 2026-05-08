import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { randomUUID } from 'crypto';

export type SprintStoryDocument = HydratedDocument<SprintStory>;

export enum GithubStatus {
  NO_BRANCH = 'no_branch',
  NO_PR = 'no_pr',
  PR_NOT_MERGED = 'pr_not_merged',
  /** PR is merged but the author's GitHub username does not match the JIRA assignee's. */
  AUTHOR_MISMATCH = 'author_mismatch',
  VERIFIED = 'verified',
}

@Schema({ timestamps: true })
export class SprintStory {
  @Prop({ type: String, default: () => randomUUID() })
  storyId!: string;

  @Prop({ required: true, index: true })
  teamId!: string;

  @Prop({ required: true })
  issueKey!: string;

  @Prop({ required: true })
  summary!: string;

  /** JIRA resolution name, e.g. "Done", "In Progress", null = unresolved */
  @Prop({ type: String, default: null })
  resolution!: string | null;

  /** JIRA status name, e.g. "To Do", "In Progress", "Done" */
  @Prop({ required: true })
  status!: string;

  /** Story points / work value from JIRA (customfield_10016) */
  @Prop({ type: Number, default: 0 })
  work!: number;

  /** JIRA assignee accountId (Cloud) */
  @Prop({ type: String, default: null })
  assignee!: string | null;

  /** Resolved internal student _id from User collection */
  @Prop({ type: String, default: null })
  assigneeStudentId!: string | null;

  /** JIRA reporter accountId */
  @Prop({ type: String, default: null })
  reporter!: string | null;

  /** Truncated issue description */
  @Prop({ type: String, default: null })
  description!: string | null;

  /** JIRA active sprint ID string for grouping */
  @Prop({ type: String, default: null })
  jiraSprintId!: string | null;

  /** GitHub verification status */
  @Prop({
    type: String,
    enum: Object.values(GithubStatus),
    default: GithubStatus.NO_BRANCH,
  })
  githubStatus!: GithubStatus;

  /** Timestamp when the PR was merged (githubStatus = verified) */
  @Prop({ type: Date, default: null })
  verifiedAt!: Date | null;

  /** Legacy booleans kept for backward compatibility */
  @Prop({ required: true, default: false })
  githubBranchFound!: boolean;

  @Prop({ required: true, default: false })
  githubPrFound!: boolean;

  /** GitHub login of whoever opened the merged PR (only set when one was found). */
  @Prop({ type: String, default: null })
  prAuthorLogin!: string | null;

  /** True when resolution=Done AND githubStatus=verified */
  @Prop({ type: Boolean, default: false })
  isComplete!: boolean;

  /** Locked after sprint finalization — no further sync updates */
  @Prop({ type: Boolean, default: false })
  isLocked!: boolean;

  @Prop({ required: true })
  syncRunId!: string;

  @Prop({ type: Date, default: Date.now })
  syncedAt!: Date;
}

export const SprintStorySchema = SchemaFactory.createForClass(SprintStory);

SprintStorySchema.index({ teamId: 1, issueKey: 1 }, { unique: true });
