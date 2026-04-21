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
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'; 
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; 
import { RolesGuard } from '../auth/guards/roles.guard';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { Request } from 'express'; 

@ApiTags('Submissions')
@ApiBearerAuth() 
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new submission' })
  async create(@Body() createSubmissionDto: CreateSubmissionDto) {
    return this.submissionsService.createSubmission(createSubmissionDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all submissions. Filter by groupId for students.' })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  async findAll(@Req() req: Request & { user: any }, @Query('groupId') groupId?: string) {
    const userRole = req.user.role;
    const userGroupId = req.user.teamId || req.user.groupId;

    if (userRole === 'Student') {
      if (!groupId) {
        throw new BadRequestException('Students must provide their groupId to view submissions.');
      }
      
      // SECURITY CHECK: Student can only request his/her own group
      if (groupId !== userGroupId) {
        throw new ForbiddenException('You do not have permission to view other groups\' submissions.');
      }
    }

    return this.submissionsService.findAll(groupId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get submission details by ID' })
  async findOne(@Req() req: Request & { user: any }, @Param('id') id: string) { 
    // CAST ERROR FIX: Format check to prevent 500 errors
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException('Invalid submission ID format');
    }

    const submission = await this.submissionsService.findOne(id);
    const userRole = req.user.role;

    if (userRole === 'Student' && submission.groupId !== req.user.teamId && submission.groupId !== req.user.groupId) {
      throw new ForbiddenException('You do not have permission to view this submission.');
    }

    return submission;
  }

  @Post(':submissionId/documents')
  @UseGuards(GroupMemberGuard) 
  @ApiOperation({ summary: 'Upload documents to a specific submission' })
  @UseInterceptors(FileInterceptor('file', {
    fileFilter: (req, file, callback) => {
      if (!file.originalname.match(/\.(pdf|doc|docx|png|jpg|jpeg)$/)) {
        return callback(
          new BadRequestException('Only PDF, Word, and Image files are allowed!'),
          false,
        );
      }
      callback(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 },
  }))
  async uploadFile(
    @Param('submissionId') submissionId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('File is required or invalid file type.');
    }
    return this.submissionsService.uploadDocument(submissionId, file);
  }
}