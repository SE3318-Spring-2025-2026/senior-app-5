import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument, GroupStatus } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { Submission } from '../submissions/schemas/submission.schema';
import { User, UserDocument } from '../users/data/user.schema';
import {
  CommitteeEvaluation,
  CommitteeEvaluationDocument,
  EvaluationGrade,
} from './schemas/committee-evaluation.schema';
import {
  CommitteeGradeResultDto,
  CommitteeGradeStatus,
  CommitteeMemberGradeDto,
} from './dto/committee-grade-result.dto';
import { Committee, CommitteeDocument } from '../committees/schemas/committee.schema';

const GRADE_NUMERIC: Record<EvaluationGrade, number> = {
  [EvaluationGrade.A]: 4,
  [EvaluationGrade.B]: 3,
  [EvaluationGrade.C]: 2,
  [EvaluationGrade.D]: 1,
  [EvaluationGrade.F]: 0,
};

@Injectable()
export class GroupsService {
  private readonly logger = new Logger(GroupsService.name);

  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(Submission.name) private submissionModel: Model<Submission>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(CommitteeEvaluation.name)
    private evaluationModel: Model<CommitteeEvaluationDocument>,
    @InjectModel(Committee.name)
    private committeeModel: Model<CommitteeDocument>,
  ) {}

  async createGroup(createGroupDto: CreateGroupDto): Promise<Group> {
    const group = new this.groupModel({
      ...createGroupDto,
      status: GroupStatus.ACTIVE,
    });

    return group.save();
  }

  async findGroupById(groupId: string): Promise<Group | null> {
    return this.groupModel.findOne({ groupId }).exec();
  }

  async addMember(groupId: string, memberUserId: string) {
    const group = await this.findGroupById(groupId);
    if (!group) {
      throw new NotFoundException(`Group not found for groupId: ${groupId}`);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        memberUserId,
        { teamId: groupId },
        { new: true, select: '-passwordHash' },
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User not found for id: ${memberUserId}`);
    }

    return {
      groupId,
      memberUserId,
      user: updatedUser,
    };
  }

  async validateStatementOfWork(groupId: string) {
    const submissions = await this.submissionModel.find({
      groupId: groupId,
      type: { $in: ['SOW', 'RevisedProposal'] },
    });

    if (!submissions || submissions.length === 0) {
      throw new NotFoundException(
        `No submission records found for group ID: ${groupId}`,
      );
    }

    const sow = submissions.find((sub) => sub.type === 'SOW');
    const revisedProposal = submissions.find(
      (sub) => sub.type === 'RevisedProposal',
    );

    const sowStatus = sow ? sow.status : 'Not Submitted';
    const revisedStatus = revisedProposal
      ? revisedProposal.status
      : 'Not Required';

    let validationState = 'Pending';

    if (
      sowStatus === 'Approved' &&
      (revisedStatus === 'Approved' || revisedStatus === 'Not Required')
    ) {
      validationState = 'Approved';
    } else if (
      sowStatus === 'Needs Revision' ||
      revisedStatus === 'Needs Revision'
    ) {
      validationState = 'Needs Revision';
    } else if (sowStatus === 'Submitted' || revisedStatus === 'Submitted') {
      validationState = 'Submitted';
    }

    return {
      groupId,
      documents: {
        statementOfWork: sowStatus,
        revisedProposal: revisedStatus,
      },
      overallValidationStatus: validationState,
      canClearSowStatus: validationState === 'Approved',
    };
  }

  async getCommitteeGrade(
    groupId: string,
    deliverableId: string,
    correlationId?: string,
  ): Promise<CommitteeGradeResultDto> {
    try {
      const evaluations = await this.evaluationModel
        .find({ groupId, deliverableId })
        .lean<CommitteeEvaluation[]>()
        .exec();

      if (!evaluations || evaluations.length === 0) {
        throw new NotFoundException(
          `No committee evaluation records found for group '${groupId}' and deliverable '${deliverableId}'.`,
        );
      }

      const committeeGradeList: CommitteeMemberGradeDto[] = evaluations.map(
        (e) => ({ memberId: e.memberId, grade: e.grade }),
      );

      const numericSum = evaluations.reduce(
        (sum, e) => sum + (GRADE_NUMERIC[e.grade] ?? 0),
        0,
      );
      const averageGrade = numericSum / evaluations.length;

      const submissionId = evaluations[0].submissionId;

      const committee = await this.committeeModel
        .findOne({ 'groups.groupId': groupId })
        .lean<{ jury: Array<{ userId: string }> } | null>()
        .exec();

      let status = CommitteeGradeStatus.PENDING;
      if (committee) {
        const juryIds = (committee.jury ?? []).map((j) => j.userId);
        const submittedIds = new Set(evaluations.map((e) => e.memberId));
        const allSubmitted =
          juryIds.length > 0 && juryIds.every((id) => submittedIds.has(id));
        if (allSubmitted) {
          status = CommitteeGradeStatus.GRADED;
        }
      }

      this.logger.log({
        event: 'committee_grade_aggregated',
        groupId,
        deliverableId,
        memberCount: evaluations.length,
        status,
        correlationId,
      });

      return {
        groupId,
        deliverableId,
        submissionId,
        committeeGradeList,
        averageGrade,
        status,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.logger.error({
        event: 'committee_grade_aggregation_failed',
        groupId,
        deliverableId,
        correlationId,
        error: (error as Error).message,
      });
      throw new InternalServerErrorException(
        'Failed to aggregate committee grades due to an unexpected error.',
      );
    }
  }
}
