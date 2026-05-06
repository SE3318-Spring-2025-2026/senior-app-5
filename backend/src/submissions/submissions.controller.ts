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
  Res,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { SubmissionsService } from './submissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../auth/enums/role.enum';
import { GroupMemberGuard } from '../auth/guards/group-member.guard';
import { JurySubmissionResponseDto } from './dto/jury-submission-response.dto';
export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_UPLOAD_EXTENSIONS_REGEX =
  /\.(pdf|doc|docx|png|jpg|jpeg)$/i;

type UploadedSubmissionFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export function submissionsFileFilter(
  _req: Request,
  file: UploadedSubmissionFile,
  callback: (error: Error | null, acceptFile: boolean) => void,
) {
  if (!ALLOWED_UPLOAD_EXTENSIONS_REGEX.test(file.originalname)) {
    callback(
      new BadRequestException(
        'Only PDF, DOC, DOCX, PNG, JPG, and JPEG files are allowed.',
      ) as unknown as Error,
      false,
    );
    return;
  }

  callback(null, true);
}

@ApiTags('Submissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('submissions')
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  private validateObjectIdFormat(value: string, fieldName = 'ID') {
    if (!value.match(/^[0-9a-fA-F]{24}$/)) {
      throw new BadRequestException(`Invalid ${fieldName} format`);
    }
  }

  private validateUploadedFile(file?: UploadedSubmissionFile) {
    if (!file) {
      throw new BadRequestException('File is required.');
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 5MB limit.');
    }
  }

  @Get('me')
  @Roles(Role.Student)
  @ApiOperation({ summary: 'Get submissions for current student user' })
  async getMySubmissions(@Req() req: Request & { user: any }) {
    const userGroupId = req.user.groupId;

    if (!userGroupId) {
      throw new ForbiddenException('You do not belong to any group (teamId).');
    }

    return this.submissionsService.findAll(userGroupId);
  }

  @Post()
  @Roles(Role.Student, Role.TeamLeader) 
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
  @ApiOperation({
    summary: 'Check if a submission meets all phase requirements',
  })
  async getCompleteness(
    @Req() req: Request & { user: any },
    @Param('submissionId') submissionId: string,
  ) {
    this.validateObjectIdFormat(submissionId);

    const userRole = req.user?.role;
    if (userRole === Role.Student) {
      const submission = await this.submissionsService.findOne(submissionId);
      if (String(submission.groupId) !== String(req.user.groupId)) {
        throw new ForbiddenException(
          'This document does not belong to your group.',
        );
      }
    }

    return this.submissionsService.getCompleteness(submissionId);
  }

  @Post(':submissionId/documents')
  @UseGuards(GroupMemberGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_UPLOAD_SIZE_BYTES },
      fileFilter: submissionsFileFilter,
    }),
  )
  @ApiOperation({ summary: 'Upload a document for a submission' })
  @ApiResponse({ status: 201, description: 'Document uploaded successfully' })
  async uploadFile(
    @Req() req: Request & { user: any; submission?: any },
    @Param('submissionId') submissionId: string,
    @UploadedFile() file?: UploadedSubmissionFile,
  ) {
    this.validateObjectIdFormat(submissionId, 'submissionId');
    this.validateUploadedFile(file);
    const validatedFile = file!;

    return this.submissionsService.uploadDocument(
      submissionId,
      validatedFile,
      req.submission,
    );
  }

  @Get(':submissionId/documents/:documentIndex')
  @UseGuards(GroupMemberGuard)
  @ApiOperation({ summary: 'Download a submission document by index' })
  async downloadDocument(
    @Req() req: Request & { submission?: any },
    @Param('submissionId') submissionId: string,
    @Param('documentIndex') documentIndex: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.validateObjectIdFormat(submissionId, 'submissionId');
    const parsedIndex = Number(documentIndex);
    if (!Number.isInteger(parsedIndex) || parsedIndex < 0) {
      throw new BadRequestException('Invalid document index.');
    }

    const file = await this.submissionsService.getDocumentForDownload(
      submissionId,
      parsedIndex,
      req.submission,
    );

    res.setHeader('Content-Type', file.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.originalName}"`,
    );
    return new StreamableFile(file.buffer);
  }

  @Get()
  @ApiOperation({
    summary: 'Get all submissions. Filter enforced for students.',
  })
  @ApiQuery({ name: 'groupId', required: false, type: String })
  async findAll(
    @Req() req: Request & { user: any },
    @Query('groupId') groupId?: string,
  ) {
    const userRole = req.user.role;
    const userGroupId = req.user.groupId;

    if (userRole === Role.Student) {
      if (!groupId || String(groupId) !== String(userGroupId)) {
        throw new ForbiddenException(
          'You can only access data from your own group.',
        );
      }
    }

    return this.submissionsService.findAll(groupId);
  }

  @Get(':id')
  @Roles(Role.Student, Role.TeamLeader, Role.Professor, Role.Coordinator, Role.Admin) 
  @ApiOperation({ summary: 'Get submission details by ID' })
  async findOne(@Req() req: Request & { user: any }, @Param('id') id: string) {
    this.validateObjectIdFormat(id);
    const submission = await this.submissionsService.findOne(id);
    const userRole = req.user.role;

    if (
      userRole === Role.Student &&
      String(submission.groupId) !== String(req.user.groupId)
    ) {
      throw new ForbiddenException(
        'You do not have permission to access this document.',
      );
    }

    return submission;
  }

  @Get('committee/:groupId')
  @Roles(Role.Professor)
  @ApiOperation({ summary: 'List submissions for a committee-assigned group' })
  @ApiResponse({ status: 200, type: [JurySubmissionResponseDto] })
  async getSubmissionsForCommittee(
    @Req() req: Request & { user: any },
    @Param('groupId') groupId: string,
  ) {
    const userId = req.user.userId || req.user.sub || req.user._id;
    return this.submissionsService.listSubmissionsForJury(userId, groupId);
  }

  @Get('committee/detail/:submissionId')
  @Roles(Role.Professor)
  @ApiOperation({ summary: 'Get single submission detail for jury member' })
  @ApiResponse({ status: 200, type: JurySubmissionResponseDto })
  async getSubmissionDetailForCommittee(
    @Req() req: Request & { user: any },
    @Param('submissionId') submissionId: string,
  ) {
    const userId = req.user.userId || req.user.sub || req.user._id;
    this.validateObjectIdFormat(submissionId, 'submissionId');
    return this.submissionsService.getSubmissionForJury(userId, submissionId);
  }
  
}
