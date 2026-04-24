import 'multer';
import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';

@ApiTags('Submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Get('me')
  @Roles(Role.Student)
  @ApiOperation({ summary: 'Get submissions for current student user' })
  async getMySubmissions(@Req() req: Request & { user: any }) {
    const userGroupId = req.user.groupId;

    if (!userGroupId) {
      throw new ForbiddenException('Herhangi bir gruba (teamId) sahip değilsiniz.');
    }

    return this.submissionsService.findAll(userGroupId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new submission' })
  async create(
    @Req() req: Request & { user: any },
    @Body() createSubmissionDto: CreateSubmissionDto,
  ) {
    
    await this.submissionsService.assertAuthorizedGroupMember(
      req.user,
      createSubmissionDto.groupId,
    );
    return this.submissionsService.createSubmission(createSubmissionDto);
  }

  @Get(':submissionId/completeness')
  @ApiOperation({ summary: 'Check if a submission meets all phase requirements' })
  async getCompleteness(
    @Req() req: Request & { user: any },
    @Param('submissionId') submissionId: string,
  ) {
    if (!submissionId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid ID format');
    }

    const userRole = req.user?.role;
    if (userRole === Role.Student) {
      const submission = await this.submissionsService.findOne(submissionId);
      if (String(submission.groupId) !== String(req.user.groupId)) {
        throw new ForbiddenException('Bu doküman size ait değil!');
      }
    }
    
    return this.submissionsService.getCompleteness(submissionId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all submissions. Filter enforced for students.' })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  async findAll(@Req() req: Request & { user: any }, @Query('groupId') groupId?: string) {
    const userRole = req.user.role;
    const userGroupId = req.user.groupId;

    // ÖĞRENCİ FİLTRESİ: Kendi grubundan başkasını göremez, filtre zorunludur.
    if (userRole === Role.Student) {
      if (!groupId || groupId !== String(userGroupId)) {
        throw new ForbiddenException('Sadece kendi grubunuzun verilerine erişebilirsiniz.');
      }
    }

    return this.submissionsService.findAll(groupId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get submission details by ID' })
  async findOne(@Req() req: Request & { user: any }, @Param('id') id: string) {
    const submission = await this.submissionsService.findOne(id);
    const userRole = req.user.role;

    if (userRole === Role.Student && String(submission.groupId) !== String(req.user.groupId)) {
      throw new ForbiddenException('Bu dokümana erişim yetkiniz yok.');
    }

    return submission;
  }
}