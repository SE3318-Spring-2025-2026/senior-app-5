import {
  BadGatewayException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  SprintConfig,
  SprintConfigDocument,
} from './schemas/sprint-config.schema';
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

@Injectable()
export class StoryPointsService {
  private readonly logger = new Logger(StoryPointsService.name);

  constructor(
    @InjectModel(StoryPointRecord.name)
    private readonly recordModel: Model<StoryPointRecordDocument>,
    @InjectModel(SprintConfig.name)
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
    const sprintConfig = await this.requireSprintConfig(groupId, sprintId);
    this.assertActiveSprintWindow(sprintConfig);

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
            targetPoints: sprintConfig.targetStoryPoints,
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
    dto: OverrideStoryPointsDto,
    requestedBy: string,
  ): Promise<StudentStoryPointRecordDto> {
    const sprintConfig = await this.requireSprintConfig(groupId, sprintId);

    const existing = await this.recordModel
      .findOne({ studentId: dto.studentId, sprintId })
      .exec();

    const oldSource = existing?.source ?? 'NONE';

    const updated = await this.recordModel
      .findOneAndUpdate(
        { studentId: dto.studentId, sprintId },
        {
          studentId: dto.studentId,
          groupId,
          sprintId,
          completedPoints: dto.completedPoints,
          targetPoints: sprintConfig.targetStoryPoints,
          source: StoryPointSource.COORDINATOR_OVERRIDE,
        },
        { upsert: true, new: true },
      )
      .exec();

    if (!updated) {
      throw new NotFoundException('Failed to upsert story point override');
    }

    this.logger.log(
      `override studentId=${dto.studentId} sprintId=${sprintId} oldSource=${oldSource} newSource=COORDINATOR_OVERRIDE triggeredBy=${requestedBy}`,
    );

    return this.toRecordDto(updated);
  }

  async getRecords(
    groupId: string,
    sprintId: string,
  ): Promise<StoryPointSummaryDto> {
    await this.requireSprintConfig(groupId, sprintId);
    return this.buildSummary(groupId, sprintId);
  }

  private async requireSprintConfig(
    groupId: string,
    sprintId: string,
  ): Promise<SprintConfig> {
    const config = await this.sprintConfigModel
      .findOne({ groupId, sprintId })
      .exec();

    if (!config) {
      throw new UnprocessableEntityException(
        `Sprint config not found for groupId=${groupId} sprintId=${sprintId}`,
      );
    }
    return config;
  }

  private assertActiveSprintWindow(config: SprintConfig): void {
    const now = new Date();
    if (now < config.startDate || now > config.endDate) {
      throw new UnprocessableEntityException(
        `No active sprint window for sprintId=${config.sprintId}`,
      );
    }
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
