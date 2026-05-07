import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request as ExpressRequest,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SubmissionsService } from './submissions.service';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { RevisionRequestResponseDto } from './dto/revision-request-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';

interface RequestWithUser extends ExpressRequest {
  user: {
    userId: string;
    role: string;
    [key: string]: any;
  };
}

@ApiTags('Submissions - Comments & Revisions')
@ApiBearerAuth()
@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  /**
   * POST /submissions/:submissionId/comments
   * Add a review comment to a submission.
   * Only jury members can comment.
   */
  @Post(':submissionId/comments')
  @Roles(Role.Professor)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add a comment to a submission',
    description: 'Jury members can add review comments to submissions.',
  })
  async addComment(
    @Param('submissionId') submissionId: string,
    @Body() dto: AddCommentDto,
    @ExpressRequest() req: RequestWithUser,
  ): Promise<CommentResponseDto> {
    const reviewerUserId = req.user.userId ?? req.user.sub ?? req.user._id;
    return this.submissionsService.addComment(reviewerUserId, submissionId, dto);
  }

  /**
   * GET /submissions/:submissionId/comments
   * List all comments for a submission.
   * Only jury members can view comments.
   */
  @Get(':submissionId/comments')
  @Roles(Role.Professor)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'List comments for a submission',
    description: 'Retrieve all review comments for a submission.',
  })
  async listComments(
    @Param('submissionId') submissionId: string,
    @ExpressRequest() req: RequestWithUser,
  ): Promise<CommentResponseDto[]> {
    const reviewerUserId = req.user.userId ?? req.user.sub ?? req.user._id;
    return this.submissionsService.listComments(reviewerUserId, submissionId);
  }

  /**
   * POST /submissions/:submissionId/revision-requests
   * Request a revision of a submission.
   * Only jury members can request revisions.
   */
  @Post(':submissionId/revision-requests')
  @Roles(Role.Professor)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Request a revision of a submission',
    description: 'Jury members can request groups to revise their submissions by providing a due date.',
  })
  async createRevisionRequest(
    @Param('submissionId') submissionId: string,
    @Body() dto: CreateRevisionRequestDto,
    @ExpressRequest() req: RequestWithUser,
  ): Promise<RevisionRequestResponseDto> {
    const reviewerUserId = req.user.userId ?? req.user.sub ?? req.user._id;
    return this.submissionsService.createRevisionRequest(
      reviewerUserId,
      submissionId,
      dto,
    );
  }
}
