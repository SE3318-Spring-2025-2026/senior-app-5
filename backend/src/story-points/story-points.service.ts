import {
  BadGatewayException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SprintConfigEntry,
  SprintConfigDocument,
} from '../sprint-configs/schemas/sprint-config.schema';
import {
  StoryPointRecord,
  StoryPointRecordDocument,
  StoryPointSource,
} from './schemas/story-point-record.schema';
import { User, UserDocument } from '../users/data/user.schema';
import { FetchStoryPointsDto } from './dto/fetch-story-points.dto';
import { OverrideStoryPointsDto } from './dto/override-story-points.dto';
import {
  StoryPointSummaryDto,
  StudentStoryPointRecordDto,
} from './dto/story-point-summary.dto';
import { JiraGithubService } from './jira-github.service';
import { Role } from '../auth/enums/role.enum';

@Injectable()
export class StoryPointsService {
  private readonly logger = new Logger(StoryPointsService.name);

  constructor(
    @InjectModel(StoryPointRecord.name)
    private readonly recordModel: Model<StoryPointRecordDocument>,
    @InjectModel(SprintConfigEntry.name)
    private readonly sprintConfigModel: Model<SprintConfigDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jiraGithubService: JiraGithubService,
  ) {}

  async fetchAndVerify(
    groupId: string,
    sprintId: string,
    dto: FetchStoryPointsDto,
    requestedBy: string,
  ): Promise<StoryPointSummaryDto> {
    const sprintConfig = await this.requireSprintConfig(sprintId);

    const studentIds = dto.studentIds?.length
      ? dto.studentIds
      : await this.resolveGroupMemberIds(groupId);

    let externalResults: { studentId: string; completedPoints: number }[];
    try {
      externalResults = await this.jiraGithubService.fetchStoryPoints(
        groupId,
        sprintId,
        studentIds,
      );
    } catch {
      throw new BadGatewayException('JIRA/GitHub API unreachable');
    }

    const pointsMap = new Map(
      externalResults.map((r) => [r.studentId, r.completedPoints]),
    );

    for (const studentId of studentIds) {
      const existing = await this.recordModel
        .findOne({ studentId, sprintId })
        .exec();

      if (existing?.source === StoryPointSource.COORDINATOR_OVERRIDE) {
        this.logger.log(
          `Skipping fetch for studentId=${studentId} sprintId=${sprintId} — COORDINATOR_OVERRIDE protected`,
        );
        continue;
      }

      const completedPoints = pointsMap.get(studentId) ?? 0;

      await this.recordModel
        .findOneAndUpdate(
          { studentId, sprintId },
          {
            studentId,
            groupId,
            sprintId,
            completedPoints,
            targetPoints: existing?.targetPoints ?? sprintConfig.targetStoryPoints,
            source: StoryPointSource.JIRA_GITHUB,
          },
          { upsert: true, new: true },
        )
        .exec();
    }

    this.logger.log(
      `fetchAndVerify groupId=${groupId} sprintId=${sprintId} requestedBy=${requestedBy} source=JIRA_GITHUB`,
    );

    return this.buildSummary(groupId, sprintId);
  }

  async override(
    groupId: string,
    sprintId: string,
    studentId: string,
    dto: OverrideStoryPointsDto,
    requestedBy: string,
    requesterRole: string,
  ): Promise<StudentStoryPointRecordDto> {
    await this.requireSprintConfig(sprintId);
    await this.assertOverrideAccess(groupId, studentId, requestedBy, requesterRole);

    const existing = await this.recordModel
      .findOne({ studentId, sprintId })
      .exec();

    const oldTarget = existing?.targetPoints ?? 'NONE';
    const existingCompleted = existing?.completedPoints ?? 0;
    const existingSource = existing?.source ?? StoryPointSource.MANUAL;

    const updated = await this.recordModel
      .findOneAndUpdate(
        { studentId, sprintId },
        {
          studentId,
          groupId,
          sprintId,
          completedPoints: existingCompleted,
          targetPoints: dto.targetPoints,
          source: existingSource,
        },
        { upsert: true, new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to upsert story point override');
    }

    this.logger.log(
      `override target studentId=${studentId} sprintId=${sprintId} oldTarget=${oldTarget} newTarget=${dto.targetPoints} triggeredBy=${requestedBy}`,
    );

    return this.toRecordDto(updated);
  }

  async getRecords(
    groupId: string,
    sprintId: string,
  ): Promise<StoryPointSummaryDto> {
    await this.requireSprintConfig(sprintId);
    return this.buildSummary(groupId, sprintId);
  }

  private async requireSprintConfig(sprintId: string): Promise<SprintConfigEntry> {
    const config = await this.sprintConfigModel
      .findOne({ sprintId })
      .exec();

    if (!config) {
      throw new UnprocessableEntityException(
        `Sprint config not found for sprintId=${sprintId}`,
      );
    }
    return config;
  }

  private async resolveGroupMemberIds(groupId: string): Promise<string[]> {
    const members = await this.userModel
      .find({ teamId: groupId }, { _id: 1 })
      .exec();

    if (!members.length) {
      throw new NotFoundException(`No members found for groupId=${groupId}`);
    }

    return members.map((m) => (m._id as unknown as { toString(): string }).toString());
  }

  private async assertOverrideAccess(
    groupId: string,
    studentId: string,
    requestedBy: string,
    requesterRole: string,
  ): Promise<void> {
    const requester = await this.userModel
      .findById(requestedBy, { _id: 1, teamId: 1, role: 1 })
      .exec();
    if (!requester) {
      throw new ForbiddenException('Requester user not found');
    }

    if (String(requester.teamId ?? '') !== String(groupId)) {
      throw new ForbiddenException('You can only override targets for your own group');
    }

    if (requesterRole === Role.Student && String(requestedBy) !== String(studentId)) {
      throw new ForbiddenException('Students can only override their own target points');
    }

    const targetUser = await this.userModel
      .findById(studentId, { _id: 1, teamId: 1 })
      .exec();
    if (!targetUser || String(targetUser.teamId ?? '') !== String(groupId)) {
      throw new NotFoundException(`Student ${studentId} is not in group ${groupId}`);
    }
  }

  private async buildSummary(
    groupId: string,
    sprintId: string,
  ): Promise<StoryPointSummaryDto> {
    const records = await this.recordModel.find({ groupId, sprintId }).exec();
    return {
      groupId,
      sprintId,
      records: records.map((r) => this.toRecordDto(r)),
    };
  }

  private toRecordDto(record: StoryPointRecordDocument): StudentStoryPointRecordDto {
    return {
      studentId: record.studentId,
      completedPoints: record.completedPoints,
      targetPoints: record.targetPoints,
      source: record.source,
      updatedAt: (record as any).updatedAt as Date,
    };
  }
}
