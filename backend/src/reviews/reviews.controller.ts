import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Get,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import {
  ReviewCommentResponseDto,
  ReviewResponseDto,
  RevisionRequestResponseDto,
  SubmitGradeResponseDto,
} from './dto/review-response.dto';
import { SubmitGradeDto } from './dto/submit-grade.dto';
import { ReviewsService } from './reviews.service';

type RequestWithUser = Request & {
  user: {
    userId?: string;
    role?: string;
    groupId?: string;
  };
};

@ApiTags('Reviews')
@ApiBearerAuth('access-token')
@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiOperation({
    operationId: 'createReview',
    summary: 'Create a review for a submission',
  })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Request validation failed' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Caller is not in the committee jury' })
  @ApiConflictResponse({
    description: 'Review already exists for this reviewer and submission',
  })
  @ApiNotFoundResponse({ description: 'Submission or committee not found' })
  @Post()
  @Roles(Role.Professor)
  createReview(
    @Req() req: RequestWithUser,
    @Body() body: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.createReview(body, req.user);
  }

  @ApiOperation({
    operationId: 'getReview',
    summary: 'Get a review by id',
  })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid reviewId format' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Access denied' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @Get(':reviewId')
  @Roles(Role.Professor, Role.Coordinator, Role.Admin, Role.Student, Role.TeamLeader)
  getReview(
    @Req() req: RequestWithUser,
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.getReview(reviewId, req.user);
  }

  @ApiOperation({
    operationId: 'addReviewComment',
    summary: 'Add a comment to a review',
  })
  @ApiCreatedResponse({ type: ReviewCommentResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid reviewId format or payload' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Caller does not own the review' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @Post(':reviewId/comments')
  @Roles(Role.Professor)
  addComment(
    @Req() req: RequestWithUser,
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: AddCommentDto,
  ): Promise<ReviewCommentResponseDto> {
    return this.reviewsService.addComment(reviewId, body, req.user);
  }

  @ApiOperation({
    operationId: 'deleteReviewComment',
    summary: 'Delete a review comment',
  })
  @ApiNoContentResponse({ description: 'Comment deleted successfully' })
  @ApiBadRequestResponse({
    description: 'Invalid reviewId or commentId format',
  })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Caller is not the comment author' })
  @ApiNotFoundResponse({ description: 'Review or comment not found' })
  @Delete(':reviewId/comments/:commentId')
  @Roles(Role.Professor)
  @HttpCode(204)
  deleteComment(
    @Req() req: RequestWithUser,
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Param('commentId', new ParseUUIDPipe()) commentId: string,
  ): Promise<void> {
    return this.reviewsService.deleteComment(reviewId, commentId, req.user);
  }

  @ApiOperation({
    operationId: 'createReviewRevisionRequest',
    summary: 'Create a revision request for a review',
  })
  @ApiCreatedResponse({ type: RevisionRequestResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid reviewId format or payload' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Caller does not own the review' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @Post(':reviewId/revision-requests')
  @Roles(Role.Professor)
  createRevisionRequest(
    @Req() req: RequestWithUser,
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: CreateRevisionRequestDto,
  ): Promise<RevisionRequestResponseDto> {
    return this.reviewsService.createRevisionRequest(reviewId, body, req.user);
  }

  @ApiOperation({
    operationId: 'submitReviewGrade',
    summary: 'Submit a grade for a review',
  })
  @ApiOkResponse({ type: SubmitGradeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid reviewId format or payload' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' })
  @ApiForbiddenResponse({ description: 'Caller does not own the review' })
  @ApiConflictResponse({ description: 'Grade already submitted' })
  @ApiNotFoundResponse({ description: 'Review not found' })
  @ApiUnprocessableEntityResponse({
    description: 'Grade must be between 0 and 100',
  })
  @ApiResponse({
    status: HttpStatus.LOCKED,
    description: 'Grading schedule window is closed',
  })
  @Post(':reviewId/grade')
  @Roles(Role.Professor)
  @HttpCode(HttpStatus.OK)
  submitGrade(
    @Req() req: RequestWithUser,
    @Param('reviewId', new ParseUUIDPipe()) reviewId: string,
    @Body() body: SubmitGradeDto,
  ): Promise<SubmitGradeResponseDto> {
    return this.reviewsService.submitGrade(reviewId, body, req.user);
  }
}
