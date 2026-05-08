import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument, GroupStatus } from './group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import {
  Submission,
  SubmissionStatus,
} from '../submissions/schemas/submission.schema';
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
import { TeamInvite, TeamInviteDocument, InviteStatus } from './schemas/team-invite.schema';
import { Role } from '../auth/enums/role.enum';
import { Team, TeamDocument } from '../teams/schemas/team.schema';

const GRADE_NUMERIC: Record<EvaluationGrade, number> = {
  [EvaluationGrade.A]: 100,
  [EvaluationGrade.B]: 80,
  [EvaluationGrade.C]: 60,
  [EvaluationGrade.D]: 50,
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
    @InjectModel(TeamInvite.name)
    private teamInviteModel: Model<TeamInviteDocument>,
    @InjectModel(Team.name)
    private teamModel: Model<TeamDocument>,
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

  async findGroupWithDetails(groupId: string) {
    const group = await this.groupModel.findOne({ groupId }).lean().exec();
    if (!group) {
      throw new NotFoundException(`Group not found: ${groupId}`);
    }

    const safeFind = async (id: string | null | undefined) => {
      if (!id) return null;
      try {
        return await this.userModel.findById(id).select('_id name email').lean().exec();
      } catch {
        return null;
      }
    };

    const [members, leader, advisor] = await Promise.all([
      this.userModel
        .find({ teamId: groupId })
        .select('_id name email role')
        .lean()
        .exec(),
      safeFind(group.leaderUserId),
      safeFind(group.assignedAdvisorId ?? group.advisorUserId),
    ]);

    return {
      groupId: group.groupId,
      groupName: group.groupName,
      status: group.status,
      assignmentStatus: group.assignmentStatus,
      leader: leader ?? null,
      advisor: advisor ?? null,
      members: members as Array<{ _id: unknown; name?: string; email: string; role: string }>,
    };
  }

  async findAll(
    page: number,
    limit: number,
    name?: string,
    /** When provided, restricts results to groups advised by this user. */
    advisorUserId?: string,
    /** When provided, restricts results to these specific groupIds. */
    onlyGroupIds?: string[],
  ): Promise<{
    data: Array<{
      groupId: string;
      groupName: string;
      leaderUserId: string;
      advisorUserId?: string;
      status: string;
      assignmentStatus: string;
    }>;
    total: number;
    page: number;
    limit: number;
  }> {
    const filter: Record<string, unknown> = {};
    if (name?.trim()) {
      const escaped = name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.groupName = { $regex: escaped, $options: 'i' };
    }
    if (advisorUserId) {
      filter.$or = [
        { advisorUserId },
        { assignedAdvisorId: advisorUserId },
      ];
    }
    if (onlyGroupIds) {
      if (onlyGroupIds.length === 0) {
        return { data: [], total: 0, page, limit };
      }
      filter.groupId = { $in: onlyGroupIds };
    }
    const skip = (page - 1) * limit;
    const [docs, total] = await Promise.all([
      this.groupModel
        .find(filter)
        .select('groupId groupName leaderUserId advisorUserId status assignmentStatus -_id')
        .sort({ groupName: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.groupModel.countDocuments(filter).exec(),
    ]);
    return { data: docs as any[], total, page, limit };
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

    const sowStatus = sow ? String(sow.status) : 'Not Submitted';
    const revisedStatus = revisedProposal
      ? String(revisedProposal.status)
      : 'Not Required';

    let validationState = 'Pending';

    if (
      sowStatus === SubmissionStatus.Approved &&
      (revisedStatus === SubmissionStatus.Approved ||
        revisedStatus === 'Not Required')
    ) {
      validationState = SubmissionStatus.Approved;
    } else if (
      sowStatus === SubmissionStatus.NeedsRevision ||
      revisedStatus === SubmissionStatus.NeedsRevision ||
      sowStatus === 'Needs Revision' ||
      revisedStatus === 'Needs Revision'
    ) {
      validationState = 'Needs Revision';
    } else if (
      sowStatus === SubmissionStatus.UnderReview ||
      revisedStatus === SubmissionStatus.UnderReview ||
      sowStatus === 'Submitted' ||
      revisedStatus === 'Submitted'
    ) {
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

  // ─── Team Creation & Invite System ────────────────────────────────────────

  async createGroupByStudent(userId: string, groupName: string): Promise<Group> {
    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.teamId) throw new ConflictException('You are already in a team');

    const group = new this.groupModel({
      groupName,
      leaderUserId: userId,
      status: GroupStatus.ACTIVE,
    });
    const saved = await group.save();

    await this.userModel.findByIdAndUpdate(userId, {
      role: Role.TeamLeader,
      teamId: saved.groupId,
    }).exec();

    // Mirror this group as a Team document so the integrations layer (JIRA/GitHub
    // credentials, sync, finalize) has a row to attach credentials to. The Team
    // doc is keyed by leaderId; pre-link groupId so the auto-finalize cron can
    // resolve teams without manual coordinator action.
    await this.teamModel.updateOne(
      { leaderId: userId },
      {
        $setOnInsert: {
          name: groupName,
          leaderId: userId,
        },
        $set: {
          groupId: saved.groupId,
        },
      },
      { upsert: true },
    );

    return saved;
  }

  async sendInvite(groupId: string, leaderId: string, invitedUserEmail: string) {
    const group = await this.groupModel.findOne({ groupId }).exec();
    if (!group) throw new NotFoundException('Group not found');
    if (group.leaderUserId !== leaderId) {
      throw new ForbiddenException('Only the group leader can send invites');
    }

    const invitedUser = await this.userModel
      .findOne({ email: invitedUserEmail.toLowerCase() })
      .exec();
    if (!invitedUser) throw new NotFoundException('No user found with that email');
    if (invitedUser.role !== Role.Student) {
      throw new BadRequestException('You can only invite users with the Student role');
    }
    if (invitedUser.teamId) {
      throw new ConflictException('This student is already in a team');
    }

    const existing = await this.teamInviteModel
      .findOne({ groupId, invitedUserId: String(invitedUser._id), status: InviteStatus.PENDING })
      .exec();
    if (existing) throw new ConflictException('A pending invite already exists for this student');

    const invite = new this.teamInviteModel({
      groupId,
      invitedUserId: String(invitedUser._id),
      invitedByUserId: leaderId,
    });
    const saved = await invite.save();

    return {
      inviteId: saved.inviteId,
      groupId: saved.groupId,
      invitedUser: { id: String(invitedUser._id), email: invitedUser.email, name: invitedUser.name },
      status: saved.status,
    };
  }

  async getInvitesByGroup(groupId: string, requesterId: string) {
    const group = await this.groupModel.findOne({ groupId }).exec();
    if (!group) throw new NotFoundException('Group not found');
    if (group.leaderUserId !== requesterId) {
      throw new ForbiddenException('Only the group leader can view invites');
    }

    const invites = await this.teamInviteModel.find({ groupId }).lean().exec();
    const userIds = invites.map((i) => i.invitedUserId);
    const users = await this.userModel
      .find({ _id: { $in: userIds } })
      .select('_id name email')
      .lean()
      .exec();
    const userMap = Object.fromEntries(users.map((u: any) => [String(u._id), u]));

    return invites.map((inv) => ({
      inviteId: inv.inviteId,
      groupId: inv.groupId,
      status: inv.status,
      createdAt: (inv as any).createdAt,
      invitedUser: userMap[inv.invitedUserId]
        ? {
            id: inv.invitedUserId,
            name: userMap[inv.invitedUserId].name ?? null,
            email: userMap[inv.invitedUserId].email,
          }
        : { id: inv.invitedUserId, name: null, email: null },
    }));
  }

  async getPendingInvitesForUser(userId: string) {
    const invites = await this.teamInviteModel
      .find({ invitedUserId: userId, status: InviteStatus.PENDING })
      .lean()
      .exec();

    const groupIds = invites.map((i) => i.groupId);
    const groups = await this.groupModel
      .find({ groupId: { $in: groupIds } })
      .lean()
      .exec();
    const groupMap = Object.fromEntries(groups.map((g: any) => [g.groupId, g]));

    return invites.map((inv) => ({
      inviteId: inv.inviteId,
      groupId: inv.groupId,
      groupName: groupMap[inv.groupId]?.groupName ?? null,
      status: inv.status,
      createdAt: (inv as any).createdAt,
    }));
  }

  async respondToInvite(inviteId: string, userId: string, accept: boolean) {
    const invite = await this.teamInviteModel.findOne({ inviteId }).exec();
    if (!invite) throw new NotFoundException('Invite not found');
    if (invite.invitedUserId !== userId) {
      throw new ForbiddenException('This invite is not addressed to you');
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new ConflictException('This invite has already been responded to');
    }

    const user = await this.userModel.findById(userId).exec();
    if (!user) throw new NotFoundException('User not found');
    if (user.teamId) throw new ConflictException('You are already in a team');

    if (accept) {
      invite.status = InviteStatus.ACCEPTED;
      await Promise.all([
        invite.save(),
        this.userModel.findByIdAndUpdate(userId, { teamId: invite.groupId }).exec(),
      ]);
      return { inviteId, status: InviteStatus.ACCEPTED, groupId: invite.groupId };
    } else {
      invite.status = InviteStatus.REJECTED;
      await invite.save();
      return { inviteId, status: InviteStatus.REJECTED };
    }
  }
}
