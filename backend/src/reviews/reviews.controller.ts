import {
  Body,
  Controller,
  Delete,
  HttpCode,
  Param,
  Post,
  Get,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AddCommentDto } from './dto/add-comment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { CreateRevisionRequestDto } from './dto/create-revision-request.dto';
import { SubmitGradeDto } from './dto/submit-grade.dto';
import { ReviewsService } from './reviews.service';

type RequestWithUser = Request & {
  user: {
    userId?: string;
    role?: string;
    groupId?: string;
  };
};

@Controller('reviews')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles(Role.Professor)
  createReview(@Req() req: RequestWithUser, @Body() body: CreateReviewDto) {
    return this.reviewsService.createReview(body, req.user);
  }

  @Get(':reviewId')
  @Roles(Role.Professor, Role.Coordinator, Role.Admin, Role.Student, Role.TeamLeader)
  getReview(@Req() req: RequestWithUser, @Param('reviewId') reviewId: string) {
    return this.reviewsService.getReview(reviewId, req.user);
  }

  @Post(':reviewId/comments')
  @Roles(Role.Professor)
  addComment(
    @Req() req: RequestWithUser,
    @Param('reviewId') reviewId: string,
    @Body() body: AddCommentDto,
  ) {
    return this.reviewsService.addComment(reviewId, body, req.user);
  }

  @Delete(':reviewId/comments/:commentId')
  @Roles(Role.Professor)
  @HttpCode(204)
  deleteComment(
    @Req() req: RequestWithUser,
    @Param('reviewId') reviewId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.reviewsService.deleteComment(reviewId, commentId, req.user);
  }

  @Post(':reviewId/revision-requests')
  @Roles(Role.Professor)
  createRevisionRequest(
    @Req() req: RequestWithUser,
    @Param('reviewId') reviewId: string,
    @Body() body: CreateRevisionRequestDto,
  ) {
    return this.reviewsService.createRevisionRequest(reviewId, body, req.user);
  }

  @Post(':reviewId/grade')
  @Roles(Role.Professor)
  @HttpCode(HttpStatus.OK)
  submitGrade(
    @Req() req: RequestWithUser,
    @Param('reviewId') reviewId: string,
    @Body() body: SubmitGradeDto,
  ) {
    return this.reviewsService.submitGrade(reviewId, body, req.user);
  }
}
